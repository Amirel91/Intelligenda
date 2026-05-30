import { NextRequest, NextResponse } from 'next/server'
import { db, ensureDbSchema } from '@/lib/db'
import { getTenantConfig } from '@/lib/tenant'
import { verifyPassword } from '@/lib/auth'
import { createCustomerToken, setCustomerSessionCookie } from '@/lib/customer-auth'

// POST /api/auth/customer/login — Password-based authentication
export async function POST(request: NextRequest) {
  try {
    await ensureDbSchema()

    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json({ error: 'Email e password sono obbligatorie' }, { status: 400 })
    }

    const normalizedEmail = email.trim().toLowerCase()
    const config = await getTenantConfig(request)
    if (!config) {
      return NextResponse.json({ error: 'Negozio non trovato' }, { status: 404 })
    }

    // Find customer by email + configId (tenant-aware)
    const customer = await db.customerUser.findFirst({
      where: {
        email: normalizedEmail,
        configId: config.id,
      },
    })

    if (!customer) {
      return NextResponse.json({ error: 'Credenziali non valide' }, { status: 401 })
    }

    // Customer must have a password set (OTP-only accounts can't login with password)
    if (!customer.password) {
      return NextResponse.json({ error: 'Questo account non ha una password impostata.' }, { status: 401 })
    }

    // Verify password
    const valid = await verifyPassword(password, customer.password)
    if (!valid) {
      return NextResponse.json({ error: 'Credenziali non valide' }, { status: 401 })
    }

    // Create JWT and set cookie
    const token = await createCustomerToken({
      customerId: customer.id,
      email: customer.email,
      nome: customer.nome,
      telefono: customer.telefono,
      configId: customer.configId,
      tenantId: customer.tenantId,
    })
    await setCustomerSessionCookie(token)

    return NextResponse.json({
      authenticated: true,
      customer: {
        id: customer.id,
        nome: customer.nome,
        telefono: customer.telefono,
        email: customer.email,
      },
    })
  } catch (error) {
    console.error('POST /api/auth/customer/login error:', error)
    return NextResponse.json({ error: 'Errore durante l\'accesso' }, { status: 500 })
  }
}
