import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

/**
 * GET /admin/impersonate?token=xxx&redirect=/admin
 * Sets the admin_token cookie and redirects to the admin dashboard.
 * Used by SuperAdmin "Impersonate" feature to log in as a tenant admin.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  const redirect = request.nextUrl.searchParams.get('redirect') || '/admin'

  if (!token) {
    return NextResponse.redirect(new URL('/admin/login', request.url))
  }

  // Set the admin session cookie (same cookie name as regular login)
  const cookieStore = await cookies()
  cookieStore.set('admin_token', token, {
    path: '/',
    maxAge: 60 * 60 * 24, // 24 hours (shorter than normal 7d)
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
  })

  return NextResponse.redirect(new URL(redirect, request.url))
}
