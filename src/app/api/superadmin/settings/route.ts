import { NextRequest, NextResponse } from 'next/server'
import { db, ensureDbSchema } from '@/lib/db'
import { requireSuperAdmin } from '@/lib/auth'

/**
 * GET /api/superadmin/settings
 * Returns all platform settings (key-value pairs).
 */
export async function GET(request: NextRequest) {
  try {
    await requireSuperAdmin(request)
    await ensureDbSchema()

    // Try to use Prisma query if PlatformSetting model exists
    const settings = await db.$queryRawUnsafe<Array<{ key: string; value: string; updatedAt: string }>>(
      `SELECT "key", "value", "updatedAt" FROM "PlatformSetting" ORDER BY "key"`
    )

    // Convert array to object
    const result: Record<string, string> = {}
    for (const s of settings) {
      result[s.key] = s.value
    }

    return NextResponse.json(result)
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'SuperAdminUnauthorized') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }
    console.error('GET /api/superadmin/settings error:', error)
    return NextResponse.json({ error: 'Errore nel caricamento impostazioni' }, { status: 500 })
  }
}

/**
 * PUT /api/superadmin/settings
 * Body: { key: string, value: string }
 * Updates a single platform setting (upsert).
 */
export async function PUT(request: NextRequest) {
  try {
    await requireSuperAdmin(request)
    await ensureDbSchema()

    const body = await request.json()
    const { key, value } = body

    if (!key || typeof key !== 'string') {
      return NextResponse.json({ error: 'Chiave non valida' }, { status: 400 })
    }

    // Allowed setting keys (whitelist)
    const allowedKeys = [
      'welcome_email_subject',
      'welcome_email_body',
      'welcome_email_enabled',
    ]

    if (!allowedKeys.includes(key)) {
      return NextResponse.json({ error: 'Chiave non consentita' }, { status: 400 })
    }

    // Upsert using raw SQL
    await db.$executeRawUnsafe(
      `INSERT INTO "PlatformSetting" ("key", "value", "updatedAt") VALUES ($1, $2, NOW())
       ON CONFLICT ("key") DO UPDATE SET "value" = $2, "updatedAt" = NOW()`,
      key,
      value || ''
    )

    return NextResponse.json({ success: true, key, value })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'SuperAdminUnauthorized') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }
    console.error('PUT /api/superadmin/settings error:', error)
    return NextResponse.json({ error: 'Errore nel salvataggio impostazioni' }, { status: 500 })
  }
}
