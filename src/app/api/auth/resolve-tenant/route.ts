import { NextRequest, NextResponse } from 'next/server'
import { db, ensureDbSchema } from '@/lib/db'

// GET /api/auth/resolve-tenant?email=xxx — Find tenant by owner email
// Used by the main domain login to redirect business owners to their subdomain
export async function GET(request: NextRequest) {
  try {
    await ensureDbSchema()
    const email = new URL(request.url).searchParams.get('email')
    if (!email) {
      return NextResponse.json({ error: 'Email obbligatoria' }, { status: 400 })
    }

    const normalizedEmail = email.trim().toLowerCase()
    const tenant = await db.tenant.findFirst({
      where: { ownerEmail: normalizedEmail, active: true },
      select: { slug: true, businessName: true },
    })

    if (!tenant) {
      return NextResponse.json({ found: false }, { status: 404 })
    }

    const host = request.headers.get('host') || ''
    const proto = request.headers.get('x-forwarded-proto') || 'https'
    const isVercelDomain = host.endsWith('.vercel.app')

    const adminUrl = isVercelDomain
      ? `${proto}://${host}/t/${tenant.slug}/admin/login`
      : `https://${tenant.slug}.intelligenda.it/admin/login`

    return NextResponse.json({ found: true, slug: tenant.slug, businessName: tenant.businessName, adminUrl })
  } catch (error) {
    console.error('GET /api/auth/resolve-tenant error:', error)
    return NextResponse.json({ error: 'Errore' }, { status: 500 })
  }
}
