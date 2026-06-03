import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { neonQueryRows } from '@/lib/neon-http'

const MAIN_DOMAINS = ['localhost:3000', 'localhost', 'intelligenda.it', 'www.intelligenda.it']

// Paths that are ALWAYS accessible (never blocked by maintenance or IP ban)
const EXCLUDED_PATHS = ['/superadmin', '/superadmin/login', '/api/superadmin', '/api/auth', '/api/internal']

// Admin page paths that don't require JWT (login + impersonate)
const ADMIN_PUBLIC_PATHS = ['/admin/login', '/admin/impersonate']

function isExcludedPath(pathname: string): boolean {
  return EXCLUDED_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))
}

/**
 * Middleware-level JWT protection for /admin/* pages.
 * Returns a redirect Response if unauthenticated, or null if OK.
 * Runs in Edge Runtime — uses jose directly (no Node.js deps).
 */
async function protectAdminRoutes(request: NextRequest, url: URL): Promise<NextResponse | null> {
  if (!url.pathname.startsWith('/admin')) return null
  if (ADMIN_PUBLIC_PATHS.some(p => url.pathname === p || url.pathname.startsWith(p + '/'))) return null

  const token = request.cookies.get('admin_token')?.value
  if (!token) {
    return NextResponse.redirect(new URL('/admin/login', request.url))
  }

  try {
    const jwtSecret = new TextEncoder().encode(
      process.env.JWT_SECRET || 'fallback-secret-change-me'
    )
    await jwtVerify(token, jwtSecret)
    return null // token valid — proceed
  } catch {
    // Token expired, malformed, or signature invalid
    const loginUrl = new URL('/admin/login', request.url)
    loginUrl.searchParams.set('expired', '1')
    return NextResponse.redirect(loginUrl)
  }
}

// Combined security cache — avoids hitting Neon on every request
let securityCache: { maintenance: boolean; bannedIps: string[]; ts: number } | null = null
const CACHE_TTL = 120_000 // 120 seconds

/**
 * Load maintenance mode + banned IPs in a SINGLE Neon HTTP query.
 * No internal API calls — no cold start cascade!
 * Uses json_agg to return both values in one row.
 */
async function loadSecurityData(): Promise<{ maintenance: boolean; bannedIps: string[] }> {
  const now = Date.now()
  if (securityCache && now - securityCache.ts < CACHE_TTL) {
    return { maintenance: securityCache.maintenance, bannedIps: securityCache.bannedIps }
  }

  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    return { maintenance: false, bannedIps: [] }
  }

  try {
    const rows = await neonQueryRows<{ maintenance: string; banned_ips: string[] }>(
      connectionString,
      `SELECT
        COALESCE(
          (SELECT value FROM "SystemSetting" WHERE key = 'maintenance_mode'),
          'false'
        ) AS maintenance,
        COALESCE(
          (SELECT json_agg("ipAddress") FROM "BannedIP"),
          '[]'::json
        ) AS banned_ips`
    )

    const row = rows?.[0]
    const maintenance = row?.maintenance === 'true'
    const bannedIps: string[] = Array.isArray(row?.banned_ips) ? row.banned_ips : []

    securityCache = { maintenance, bannedIps, ts: now }
    return { maintenance, bannedIps }
  } catch {
    // On error (tables might not exist yet), fall back to cached values or defaults
    return securityCache
      ? { maintenance: securityCache.maintenance, bannedIps: securityCache.bannedIps }
      : { maintenance: false, bannedIps: [] }
  }
}

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || ''
  const domain = hostname.split(':')[0]
  const url = request.nextUrl.clone()
  const isVercelDomain = domain.endsWith('.vercel.app')

  // Get client IP (Vercel headers)
  const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || ''

  // Single call replaces the old two fetch() calls to internal APIs
  let banned = false
  let maintenance = false
  if (!isExcludedPath(url.pathname)) {
    const data = await loadSecurityData()
    maintenance = data.maintenance
    if (clientIP) banned = data.bannedIps.includes(clientIP)
  }

  if (banned) {
    return new NextResponse('Access Denied', { status: 403 })
  }

  if (maintenance) {
    const maintenanceUrl = request.nextUrl.clone()
    maintenanceUrl.pathname = '/manutenzione'
    return NextResponse.rewrite(maintenanceUrl)
  }

  // ---- SUBDOMAIN ROUTING ----
  if (isVercelDomain && url.pathname.startsWith('/t/')) {
    const slug = url.pathname.split('/')[2]
    if (slug && slug.length > 0) {
      const response = NextResponse.redirect(new URL('/', request.url))
      response.cookies.set('tenant_slug', slug, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', httpOnly: false })
      return response
    }
  }

  const isMainDomain = MAIN_DOMAINS.some(d => { const base = d.split(':')[0]; return domain === base }) || isVercelDomain

  if (isMainDomain) {
    if (isVercelDomain) {
      const tenantCookie = request.cookies.get('tenant_slug')
      if (!tenantCookie?.value && (url.pathname === '/' || url.pathname === '')) {
        const landingUrl = request.nextUrl.clone()
        landingUrl.pathname = '/landing'
        return NextResponse.rewrite(landingUrl)
      }
      const adminCheck = await protectAdminRoutes(request, url)
      if (adminCheck) return adminCheck
      return NextResponse.next()
    }
    const isRootPath = url.pathname === '/' || url.pathname === ''
    if (isRootPath) {
      const landingUrl = request.nextUrl.clone()
      landingUrl.pathname = '/landing'
      const response = NextResponse.rewrite(landingUrl)
      response.cookies.set('tenant_slug', '', { path: '/', maxAge: 0, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' })
      return response
    }
    const response = NextResponse.next()
    response.cookies.set('tenant_slug', '', { path: '/', maxAge: 0, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' })
    return response
  }

  const parts = domain.split('.')
  const slug = parts[0]
  if (!slug || slug === 'www') {
    const response = NextResponse.next()
    response.cookies.set('tenant_slug', '', { path: '/', maxAge: 0, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' })
    return response
  }
  // Subdomain: protect admin pages with JWT before serving
  const adminCheck = await protectAdminRoutes(request, url)
  if (adminCheck) return adminCheck
  const response = NextResponse.next()
  response.cookies.set('tenant_slug', slug, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', httpOnly: false })
  return response
}

// Exclude static assets and internal APIs from middleware
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|api/internal).*)'] }
