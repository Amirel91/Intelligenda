import { NextResponse } from 'next/server'
import { db, ensureDbSchema } from '@/lib/db'
import { requireSuperAdmin } from '@/lib/auth'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    await requireSuperAdmin(request)
    await ensureDbSchema()
    const [spamLogs, bannedIPs] = await Promise.all([
      db.spamLog.findMany({ orderBy: { createdAt: 'desc' }, take: 100 }),
      db.bannedIP.findMany({ orderBy: { createdAt: 'desc' } }),
    ])
    return NextResponse.json({ spamLogs, bannedIPs })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'SuperAdminUnauthorized') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }
    console.error('GET /api/superadmin/security error:', error)
    return NextResponse.json({ error: 'Errore' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireSuperAdmin(request)
    await ensureDbSchema()
    const { ipAddress, reason } = await request.json()
    if (!ipAddress) {
      return NextResponse.json({ error: 'IP obbligatorio' }, { status: 400 })
    }
    const banned = await db.bannedIP.create({
      data: { ipAddress, reason: reason || 'Bannato manualmente dal SuperAdmin' },
    })
    return NextResponse.json(banned, { status: 201 })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'SuperAdminUnauthorized') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }
    if (error && typeof error === 'object' && 'code' in error) {
      return NextResponse.json({ error: 'IP già bannato' }, { status: 409 })
    }
    console.error('POST /api/superadmin/security error:', error)
    return NextResponse.json({ error: 'Errore' }, { status: 500 })
  }
}

// DELETE: Remove a banned IP
export async function DELETE(request: NextRequest) {
  try {
    await requireSuperAdmin(request)
    await ensureDbSchema()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'ID obbligatorio' }, { status: 400 })
    }
    await db.bannedIP.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'SuperAdminUnauthorized') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }
    console.error('DELETE /api/superadmin/security error:', error)
    return NextResponse.json({ error: 'Errore' }, { status: 500 })
  }
}
