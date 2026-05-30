import { NextRequest, NextResponse } from 'next/server'
import { db, ensureDbSchema } from '@/lib/db'
import { getTenantConfig } from '@/lib/tenant'
import { hashPassword } from '@/lib/auth'
import { createCustomerToken, setCustomerSessionCookie } from '@/lib/customer-auth'
import { sendWelcomeWithCredentials } from '@/lib/email'

// Rate limiting
const REGISTER_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000
const REGISTER_RATE_LIMIT_MAX = 3

interface RateEntry { count: number; windowStart: number }
const registerRateMap = new Map<string, RateEntry>()

setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of registerRateMap) {
    if (now - entry.windowStart > REGISTER_RATE_LIMIT_WINDOW_MS) registerRateMap.delete(key)
  }
}, 5 * 60 * 1000)

function checkRateLimit(email: string): boolean {
  const key = email.toLowerCase()
  const now = Date.now()
  const entry = registerRateMap.get(key)
  if (!entry || now - entry.windowStart > REGISTER_RATE_LIMIT_WINDOW_MS) {
    registerRateMap.set(key, { count: 1, windowStart: now })
    return true
  }
  if (entry.count >= REGISTER_RATE_LIMIT_MAX) return false
  entry.count++
  return true
}

/**
 * POST /api/auth/customer/register
 *
 * Creates a new CustomerUser with nome, telefono, email, and password,
 * then sends a welcome email with credentials and sets a session cookie.
 *
 * If password is provided: password-based registration (creates account + session)
 * If no password: falls back to OTP-based registration (legacy)
 */
export async function POST(request: NextRequest) {
  try {
    await ensureDbSchema()
    const body = await request.json()
    const { nome, telefono, email, password } = body

    if (!nome || typeof nome !== 'string' || nome.trim().length < 2) {
      return NextResponse.json({ error: 'Nome obbligatorio (almeno 2 caratteri)' }, { status: 400 })
    }

    if (!telefono || typeof telefono !== 'string' || telefono.trim().length < 6) {
      return NextResponse.json({ error: 'Telefono obbligatorio (almeno 6 caratteri)' }, { status: 400 })
    }

    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Email non valida' }, { status: 400 })
    }

    // Password validation (if provided)
    if (password !== undefined && password !== null && password !== '') {
      if (typeof password !== 'string' || password.length < 6) {
        return NextResponse.json({ error: 'La password deve avere almeno 6 caratteri' }, { status: 400 })
      }
    }

    // Rate limiting
    if (!checkRateLimit(email)) {
      return NextResponse.json(
        { error: 'Troppe richieste. Riprova tra qualche minuto.' },
        { status: 429 }
      )
    }

    // Resolve tenant
    const config = await getTenantConfig(request)
    if (!config) {
      return NextResponse.json({ error: 'Negozio non trovato' }, { status: 404 })
    }

    const normalizedEmail = email.toLowerCase().trim()
    const trimmedName = nome.trim()
    const trimmedPhone = telefono.trim()

    // Check if a CustomerUser with this email already exists
    const existing = await db.customerUser.findUnique({
      where: { email: normalizedEmail },
    })

    if (existing) {
      if (existing.configId === config.id) {
        // Already registered under this tenant
        if (password && !existing.password) {
          // Allow setting password on OTP-only account
          const hashedPassword = await hashPassword(password)
          await db.customerUser.update({
            where: { id: existing.id },
            data: {
              nome: trimmedName,
              telefono: trimmedPhone,
              password: hashedPassword,
            },
          })
        } else {
          return NextResponse.json(
            { error: 'Questo account e gia registrato. Accedi invece.' },
            { status: 409 }
          )
        }
      } else {
        // Email already used under a different tenant
        return NextResponse.json(
          { error: 'Questa email e gia registrata con un altro negozio. Usa un\'altra email o accedi direttamente.' },
          { status: 409 }
        )
      }
    } else {
      // Check if phone number is already used by another customer
      const existingPhone = await db.customerUser.findUnique({
        where: { telefono: trimmedPhone },
      })
      if (existingPhone) {
        return NextResponse.json(
          { error: 'Questo numero di telefono e gia associato a un account. Usa un altro numero o accedi.' },
          { status: 409 }
        )
      }

      // Create new CustomerUser with password (bcrypt hashed)
      const hashedPassword = password ? await hashPassword(password) : null
      await db.customerUser.create({
        data: {
          tenantId: config.tenantId,
          configId: config.id,
          email: normalizedEmail,
          telefono: trimmedPhone,
          nome: trimmedName,
          password: hashedPassword,
        },
      })
    }

    // Find the user (might be existing one we just updated)
    const customer = await db.customerUser.findUnique({
      where: { email: normalizedEmail },
    })

    if (!customer) {
      return NextResponse.json({ error: 'Errore nella creazione dell\'account' }, { status: 500 })
    }

    if (password && customer.password) {
      // Password-based registration: create session + send welcome email
      const token = await createCustomerToken({
        customerId: customer.id,
        email: customer.email,
        nome: customer.nome,
        telefono: customer.telefono,
        configId: customer.configId,
        tenantId: customer.tenantId,
      })
      await setCustomerSessionCookie(token)

      // Fire welcome email with credentials (async, non-blocking)
      const tenantSlug = request.cookies.get('tenant_slug')?.value || ''
      sendWelcomeWithCredentials(
        customer.nome,
        customer.email,
        password,
        { shopName: config.shopName },
        tenantSlug
      ).catch(err => console.error('[register] welcome email skip:', err))

      return NextResponse.json({
        success: true,
        email: normalizedEmail,
        customer: {
          id: customer.id,
          nome: customer.nome,
          telefono: customer.telefono,
          email: customer.email,
        },
      })
    }

    // Legacy OTP path (no password provided) — for backward compatibility
    const { sendOtpEmail } = await import('@/lib/email')
    const otpCode = String(Math.floor(100000 + Math.random() * 900000))
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000)

    await db.customerUser.update({
      where: { id: customer.id },
      data: { otpCode, otpExpires },
    })

    await sendOtpEmail(normalizedEmail, otpCode, config.shopName)

    return NextResponse.json({ success: true, email: normalizedEmail })
  } catch (error: unknown) {
    console.error('POST /api/auth/customer/register error:', error)
    const msg = error instanceof Error ? error.message : String(error)
    if (msg.includes('Unique') || msg.includes('unique') || msg.includes('duplicate')) {
      return NextResponse.json(
        { error: 'Email o telefono gia registrati. Prova con dati diversi o accedi al tuo account esistente.' },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: 'Errore nella registrazione. Riprova tra poco.' }, { status: 500 })
  }
}
