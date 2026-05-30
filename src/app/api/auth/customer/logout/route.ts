import { NextResponse } from 'next/server'
import { clearCustomerSessionCookie } from '@/lib/customer-auth'

/**
 * POST /api/auth/customer/logout
 *
 * Clears the customer_session cookie, logging the customer out.
 */
export async function POST() {
  try {
    await clearCustomerSessionCookie()
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('POST /api/auth/customer/logout error:', error)
    return NextResponse.json({ error: 'Errore durante il logout' }, { status: 500 })
  }
}
