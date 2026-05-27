import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyPassword, createToken } from '@/lib/auth'
import { loginSchema } from '@/lib/validations'
import { getTenantSlugFromRequest, getTenantBySlug } from '@/lib/tenant'

// POST /api/auth/login
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = loginSchema.parse(body)

    // Get tenant from cookie (set by middleware based on subdomain)
    const slug = getTenantSlugFromRequest(request)
    if (!slug) {
      return NextResponse.json({ error: 'Nessun negozio selezionato' }, { status: 400 })
    }

    // Find tenant
    const tenant = await getTenantBySlug(slug)
    if (!tenant) {
      return NextResponse.json({ error: 'Negozio non trovato' }, { status: 404 })
    }

    // Find admin within this tenant
    const user = await db.adminUser.findFirst({
      where: {
        username: data.username,
        tenantId: tenant.id,
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Credenziali non valide' },
        { status: 401 }
      )
    }

    const isValid = await verifyPassword(data.password, user.password)
    if (!isValid) {
      return NextResponse.json(
        { error: 'Credenziali non valide' },
        { status: 401 }
      )
    }

    const token = await createToken({ username: user.username, id: user.id, tenantId: tenant.id })

    // Track last login for churn monitoring
    await db.adminUser.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }).catch(() => {})

    const response = NextResponse.json({ success: true, username: user.username })
    response.cookies.set('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    })

    return response
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'issues' in error) {
      return NextResponse.json({ error: 'Dati non validi' }, { status: 400 })
    }
    console.error('POST /api/auth/login error:', error)
    return NextResponse.json({ error: 'Errore di login' }, { status: 500 })
  }
}
