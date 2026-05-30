import { NextRequest, NextResponse } from 'next/server'

const MAIN_DOMAINS = ['localhost:3000', 'localhost', 'intelligenda.it', 'www.intelligenda.it']

// Paths that are ALWAYS accessible (never blocked by maintenance or IP ban)
const EXCLUDED_PATHS = ['/superadmin', '/superadmin/login', '/api/superadmin', '/api/auth', '/api/internal']

function isExcludedPath(pathname: string): boolean {
  return EXCLUDED_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))
}

// Simple in-memory cache (per-edge-instance, ~30s TTL)
let maintenanceCache: { enabled: boolean; ts: number } | null = null
let bannedIPsCache: { ips: string[]; ts: number } | null = null
const CACHE_TTL = 120_000 // 120 seconds

async function checkMaintenanceStatus(): Promise<boolean> {
  const now = Date.now()
  if (maintenanceCache && now - maintenanceCache.ts < CACHE_TTL) {
    return maintenanceCache.enabled
  }
  try {
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000'
    const res = await fetch(`${baseUrl}/api/internal/maintenance-status`, {
      headers: { 'x-internal-check': 'true' },
    })
    if (res.ok) {
      const data = await res.json()
      maintenanceCache = { enabled: data.maintenance === true, ts: now }
      return maintenanceCache.enabled
    }
  } catch { /* fallback to cached value */ }
  return maintenanceCache?.enabled ?? false
}

async function checkIPBanned(ip: string): Promise<boolean> {
  if (!ip || ip === 'unknown') return false
  const now = Date.now()
  if (bannedIPsCache && now - bannedIPsCache.ts < CACHE_TTL) {
    return bannedIPsCache.ips.includes(ip)
  }
  try {
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000'
    const res = await fetch(`${baseUrl}/api/internal/banned-ips`, {
      headers: { 'x-internal-check': 'true' },
    })
    if (res.ok) {
      const data = await res.json()
      bannedIPsCache = { ips: Array.isArray(data.ips) ? data.ips : [], ts: now }
      return bannedIPsCache.ips.includes(ip)
    }
  } catch { /* fallback */ }
  return bannedIPsCache?.ips.includes(ip) ?? false
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

  // Run IP ban and maintenance checks in parallel (skip for excluded paths)
  let banned = false
  let maintenance = false
  if (!isExcludedPath(url.pathname)) {
    const checks = await Promise.all([
      clientIP ? checkIPBanned(clientIP) : Promise.resolve(false),
      checkMaintenanceStatus(),
    ])
    banned = checks[0]
    maintenance = checks[1]
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
  const response = NextResponse.next()
  response.cookies.set('tenant_slug', slug, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', httpOnly: false })
  return response
}

// Exclude /api/internal/* from middleware to avoid infinite recursion
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|api/internal).*)'] }
