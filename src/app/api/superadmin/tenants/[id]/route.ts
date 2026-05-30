import { NextRequest, NextResponse } from 'next/server'
import { db, ensureDbSchema } from '@/lib/db'
import { requireSuperAdmin } from '@/lib/auth'

/**
 * PATCH /api/superadmin/tenants/[id]
 * Toggle tenant active/suspended status.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin(request)
    await ensureDbSchema()

    const { id } = await params
    const body = await request.json()
    const { active } = body

    if (typeof active !== 'boolean') {
      return NextResponse.json({ error: 'Campo "active" obbligatorio (boolean)' }, { status: 400 })
    }

    const tenant = await db.tenant.findUnique({ where: { id } })
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant non trovato' }, { status: 404 })
    }

    const updated = await db.tenant.update({
      where: { id },
      data: { active },
    })

    return NextResponse.json({
      id: updated.id,
      slug: updated.slug,
      businessName: updated.businessName,
      active: updated.active,
    })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'SuperAdminUnauthorized') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }
    console.error('PATCH /api/superadmin/tenants/[id] error:', error)
    return NextResponse.json({ error: "Errore nell'aggiornamento del tenant" }, { status: 500 })
  }
}

/**
 * DELETE /api/superadmin/tenants/[id]
 * Permanently delete a tenant and all related data (cascade).
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin(request)
    await ensureDbSchema()

    const { id } = await params

    const tenant = await db.tenant.findUnique({
      where: { id },
      include: { config: true },
    })
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant non trovato' }, { status: 404 })
    }

    await db.tenant.delete({ where: { id } })

    return NextResponse.json({
      success: true,
      deletedTenant: {
        id: tenant.id,
        slug: tenant.slug,
        businessName: tenant.businessName,
      },
    })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'SuperAdminUnauthorized') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }
    console.error('DELETE /api/superadmin/tenants/[id] error:', error)
    return NextResponse.json({ error: "Errore nell'eliminazione del tenant" }, { status: 500 })
  }
}
