import { NextResponse } from 'next/server'
import { db, ensureDbSchema } from '@/lib/db'
import { requireSuperAdmin, createToken } from '@/lib/auth'
import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    await requireSuperAdmin(request)
    await ensureDbSchema()
    const { tenantId } = await request.json()
    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId obbligatorio' }, { status: 400 })
    }
    const tenant = await db.tenant.findUnique({ where: { id: tenantId } })
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant non trovato' }, { status: 404 })
    }
    const admin = await db.adminUser.findFirst({ where: { tenantId } })
    if (!admin) {
      return NextResponse.json({ error: 'Nessun admin trovato per questo tenant' }, { status: 404 })
    }
    // Create a valid admin session token
    const token = await createToken({ username: admin.username, id: admin.id, tenantId: admin.tenantId })
    const redirectUrl = `https://${tenant.slug}.intelligenda.it/admin`
    return NextResponse.json({ token, slug: tenant.slug, redirectUrl })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'SuperAdminUnauthorized') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }
    console.error('POST /api/superadmin/impersonate error:', error)
    return NextResponse.json({ error: 'Errore' }, { status: 500 })
  }
}
