import { NextResponse } from 'next/server'
import { db, ensureDbSchema } from '@/lib/db'
import { requireSuperAdmin } from '@/lib/auth'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    await requireSuperAdmin(request)
    await ensureDbSchema()
    const setting = await db.systemSetting.findUnique({ where: { key: 'maintenance_mode' } })
    return NextResponse.json({ maintenance: setting?.value === 'true' })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'SuperAdminUnauthorized') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }
    return NextResponse.json({ maintenance: false })
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireSuperAdmin(request)
    await ensureDbSchema()
    const { enabled } = await request.json()
    await db.systemSetting.upsert({
      where: { key: 'maintenance_mode' },
      update: { value: String(enabled) },
      create: { key: 'maintenance_mode', value: String(enabled) },
    })
    return NextResponse.json({ maintenance: enabled })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'SuperAdminUnauthorized') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Errore' }, { status: 500 })
  }
}
