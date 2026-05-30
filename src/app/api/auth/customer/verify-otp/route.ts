import { NextRequest, NextResponse } from 'next/server'
import { db, ensureDbSchema } from '@/lib/db'
import { getTenantConfig } from '@/lib/tenant'
import { createCustomerToken, setCustomerSessionCookie } from '@/lib/customer-auth'

/**
 * POST /api/auth/customer/verify-otp
 *
 * Verifies a 6-digit OTP code for a customer.
 * On success: clears OTP fields, creates a JWT cookie (customer_session),
 * and returns the user's profile data for pre-filling.
 */
export async function POST(request: NextRequest) {
  try {
    await ensureDbSchema()
    const body = await request.json()
    const { email, otpCode } = body

    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Email non valida' }, { status: 400 })
    }
    if (!otpCode || typeof otpCode !== 'string' || !/^\d{6}$/.test(otpCode)) {
      return NextResponse.json({ error: 'Codice non valido' }, { status: 400 })
    }

    // Resolve tenant
    const config = await getTenantConfig(request)
    if (!config) {
      return NextResponse.json({ error: 'Negozio non trovato' }, { status: 404 })
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Find the customer
    const customer = await db.customerUser.findUnique({
      where: { email: normalizedEmail },
    })

    if (!customer) {
      return NextResponse.json({ error: 'Nessun account trovato con questa email' }, { status: 404 })
    }

    // Verify OTP: code must match and not be expired
    if (!customer.otpCode || !customer.otpExpires) {
      return NextResponse.json({ error: 'Nessun codice richiesto. Richiedi un nuovo codice.' }, { status: 400 })
    }

    if (customer.otpCode !== otpCode) {
      return NextResponse.json({ error: 'Codice non corretto' }, { status: 401 })
    }

    if (new Date() > customer.otpExpires) {
      // Clear expired OTP
      await db.customerUser.update({
        where: { id: customer.id },
        data: { otpCode: null, otpExpires: null },
      })
      return NextResponse.json({ error: 'Codice scaduto. Richiedi un nuovo codice.' }, { status: 401 })
    }

    // Clear OTP fields for security
    await db.customerUser.update({
      where: { id: customer.id },
      data: { otpCode: null, otpExpires: null },
    })

    // Create JWT and set cookie
    const sessionPayload = {
      customerId: customer.id,
      email: customer.email,
      nome: customer.nome,
      telefono: customer.telefono,
      configId: customer.configId,
      tenantId: customer.tenantId,
    }

    const token = await createCustomerToken(sessionPayload)
    await setCustomerSessionCookie(token)

    // Return customer data for pre-filling the form
    return NextResponse.json({
      success: true,
      customer: {
        id: customer.id,
        nome: customer.nome,
        telefono: customer.telefono,
        email: customer.email,
      },
    })
  } catch (error) {
    console.error('POST /api/auth/customer/verify-otp error:', error)
    return NextResponse.json({ error: 'Errore nella verifica del codice' }, { status: 500 })
  }
}
