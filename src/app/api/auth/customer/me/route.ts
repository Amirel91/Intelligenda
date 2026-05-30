import { NextResponse } from 'next/server'
import { getCustomerSession } from '@/lib/customer-auth'

/**
 * GET /api/auth/customer/me
 *
 * Returns the currently logged-in customer's profile from the customer_session cookie.
 * Used by the frontend to pre-fill the booking form when a customer is logged in.
 */
export async function GET() {
  try {
    const session = await getCustomerSession()

    if (!session) {
      return NextResponse.json({ authenticated: false })
    }

    return NextResponse.json({
      authenticated: true,
      customer: {
        id: session.customerId,
        nome: session.nome,
        telefono: session.telefono,
        email: session.email,
      },
    })
  } catch (error) {
    console.error('GET /api/auth/customer/me error:', error)
    return NextResponse.json({ authenticated: false })
  }
}
