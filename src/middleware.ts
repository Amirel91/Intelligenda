import { NextRequest, NextResponse } from 'next/server'

const MAIN_DOMAINS = ['localhost:3000', 'localhost', 'intelligenda.it', 'www.intelligenda.it']

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || ''
  const domain = hostname.split(':')[0]
  const url = request.nextUrl.clone()
  const isVercelDomain = domain.endsWith('.vercel.app')

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

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] }
