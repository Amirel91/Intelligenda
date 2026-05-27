import { NextResponse } from 'next/server'
import { db, ensureDbSchema } from '@/lib/db'

/**
 * GET /api/internal/banned-ips
 * Lightweight endpoint for Edge middleware — no auth required (internal only).
 * Returns { ips: string[] } of all banned IPs.
 */
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  try {
    await ensureDbSchema()
    const banned = await db.bannedIP.findMany({ select: { ipAddress: true } })
    return NextResponse.json({ ips: banned.map(b => b.ipAddress) })
  } catch {
    return NextResponse.json({ ips: [] })
  }
}
