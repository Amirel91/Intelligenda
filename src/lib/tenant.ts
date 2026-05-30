import { db } from './db'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const MAIN_DOMAINS = ['localhost', 'intelligenda.it', 'www.intelligenda.it']

/**
 * Extract tenant slug from request (cookie set by middleware)
 */
export function getTenantSlugFromRequest(request: NextRequest): string | null {
  const cookie = request.cookies.get('tenant_slug')
  return cookie?.value || null
}

/**
 * Resolve tenant slug from request — tries cookie first, then ?slug= query param.
 * Used by billing API routes that may be called from the main domain (/account)
 * where the tenant_slug cookie is not set by the proxy.
 */
export function resolveTenantSlug(request: NextRequest): string | null {
  // 1. Try cookie (set by proxy on subdomain requests)
  const fromCookie = getTenantSlugFromRequest(request)
  if (fromCookie) return fromCookie

  // 2. Try ?slug= query parameter (used by /account on main domain)
  const fromQuery = new URL(request.url).searchParams.get('slug')
  if (fromQuery) return fromQuery

  return null
}

/**
 * Get tenant slug from cookies (for server components)
 */
export async function getTenantSlugFromCookies(): Promise<string | null> {
  const cookieStore = await cookies()
  const cookie = cookieStore.get('tenant_slug')
  return cookie?.value || null
}

/**
 * Check if request is for the main domain (landing page)
 */
export function isMainDomain(request: NextRequest): boolean {
  const hostname = request.headers.get('host') || ''
  const domain = hostname.split(':')[0] // Remove port
  return MAIN_DOMAINS.some(d => domain === d || domain.endsWith('.' + d) === false && domain.split('.').length <= 2)
}

/**
 * Resolve tenant from slug (with full billing data)
 */
export async function getTenantBySlug(slug: string) {
  return db.tenant.findUnique({
    where: { slug, active: true },
    include: { config: true },
  })
}

/**
 * Get the full tenant + config for the current request.
 * Returns null if the tenant is suspended (planEndDate expired).
 */
export async function getTenantConfig(request: NextRequest) {
  const slug = getTenantSlugFromRequest(request)
  if (!slug) return null

  const tenant = await getTenantBySlug(slug)
  if (!tenant) return null

  // ============ BILLING SUSPENSION CHECK ============
  // If the tenant is in "cancelling" state and planEndDate has passed,
  // treat as suspended — the public site and admin should be blocked.
  const now = new Date()
  const isSubscriptionExpired =
    tenant.subscriptionStatus === 'cancelling' &&
    tenant.planEndDate &&
    new Date(tenant.planEndDate) <= now

  const isSuspended =
    tenant.subscriptionStatus === 'suspended' || isSubscriptionExpired

  if (isSuspended) {
    return null // Effectively blocks access
  }

  return tenant.config || null
}

/**
 * Get config for server components (from cookies)
 */
export async function getTenantConfigFromCookies() {
  const slug = await getTenantSlugFromCookies()
  if (!slug) return null

  const tenant = await getTenantBySlug(slug)
  if (!tenant) return null

  // Same suspension check as getTenantConfig
  const now = new Date()
  const isSubscriptionExpired =
    tenant.subscriptionStatus === 'cancelling' &&
    tenant.planEndDate &&
    new Date(tenant.planEndDate) <= now

  const isSuspended =
    tenant.subscriptionStatus === 'suspended' || isSubscriptionExpired

  if (isSuspended) {
    return null
  }

  return tenant.config || null
}

/**
 * Require tenant config (throws if not found or suspended)
 */
export async function requireTenantConfig(request: NextRequest) {
  const config = await getTenantConfig(request)
  if (!config) throw new Error('TenantNotFound')
  return config
}

/**
 * Get the tenant record (with billing info) without suspension check.
 * Used by billing API routes that need to operate on suspended tenants too.
 */
export async function getTenantBySlugUnchecked(slug: string) {
  return db.tenant.findUnique({
    where: { slug },
    include: { config: true },
  })
}
