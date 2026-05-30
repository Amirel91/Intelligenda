import { NextResponse } from 'next/server'
import { db, ensureApiLogTable } from '@/lib/db'
import { requireSuperAdmin } from '@/lib/auth'
import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/superadmin/performance
 * Returns recent API performance logs for the SuperAdmin dashboard.
 */
export async function GET(request: NextRequest) {
  try {
    await requireSuperAdmin(request)
    await ensureApiLogTable()

    const logs = await db.$queryRawUnsafe<Array<{
      id: string
      endpoint: string
      responseTime: number
      configId: string | null
      createdAt: Date
    }>>(
      `SELECT * FROM "ApiLog" ORDER BY "createdAt" DESC LIMIT 100`
    )

    return NextResponse.json(logs || [])
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'SuperAdminUnauthorized') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }
    console.error('GET /api/superadmin/performance error:', error)
    return NextResponse.json([], { status: 200 }) // return empty on error, never block dashboard
  }
}
