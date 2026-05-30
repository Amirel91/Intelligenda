import { NextResponse } from 'next/server'
import { db, ensureDbSchema } from '@/lib/db'

/**
 * GET /api/internal/maintenance-status
 * Lightweight endpoint for Edge middleware — no auth required (internal only).
 * Returns { maintenance: boolean } from SystemSetting table.
 */
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  try {
    await ensureDbSchema()
    const setting = await db.systemSetting.findUnique({ where: { key: 'maintenance_mode' } })
    return NextResponse.json({ maintenance: setting?.value === 'true' })
  } catch {
    return NextResponse.json({ maintenance: false })
  }
}
