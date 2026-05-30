import { NextRequest, NextResponse } from 'next/server'
import { db, ensureDbSchema } from '@/lib/db'
import { getTenantConfig } from '@/lib/tenant'
import { sendOtpEmail } from '@/lib/email'

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
 * Creates a new CustomerUser with nome, telefono, email for this tenant,
 * then sends a 6-digit OTP to verify the email.
 * If a user with this email already exists under a DIFFERENT tenant, it still
 * allows registration under this tenant (email uniqueness is global, so we
 * update the existing record if it belongs to a different config).
 */
export async function POST(request: NextRequest) {
  try {
    await ensureDbSchema()
    const body = await request.json()
    const { nome, telefono, email } = body

    if (!nome || typeof nome !== 'string' || nome.trim().length < 2) {
      return NextResponse.json({ error: 'Nome obbligatorio (almeno 2 caratteri)' }, { status: 400 })
    }

    if (!telefono || typeof telefono !== 'string' || telefono.trim().length < 6) {
      return NextResponse.json({ error: 'Telefono obbligatorio (almeno 6 caratteri)' }, { status: 400 })
    }

    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Email non valida' }, { status: 400 })
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
        // Already registered under this tenant — just update name/phone and send OTP
        await db.customerUser.update({
          where: { id: existing.id },
          data: {
            nome: trimmedName,
            telefono: trimmedPhone,
          },
        })
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

      // Create new CustomerUser
      await db.customerUser.create({
        data: {
          tenantId: config.tenantId,
          configId: config.id,
          email: normalizedEmail,
          telefono: trimmedPhone,
          nome: trimmedName,
        },
      })
    }

    // Generate 6-digit OTP
    const otpCode = String(Math.floor(100000 + Math.random() * 900000))
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    // Find the user (might be the existing one we just updated)
    const customer = await db.customerUser.findUnique({
      where: { email: normalizedEmail },
    })

    if (!customer) {
      return NextResponse.json({ error: 'Errore nella creazione dell\'account' }, { status: 500 })
    }

    // Save OTP to database
    await db.customerUser.update({
      where: { id: customer.id },
      data: { otpCode, otpExpires },
    })

    // Send OTP email via Resend
    await sendOtpEmail(normalizedEmail, otpCode, config.shopName)

    return NextResponse.json({ success: true, email: normalizedEmail })
  } catch (error: unknown) {
    console.error('POST /api/auth/customer/register error:', error)
    // Handle Prisma unique constraint violations gracefully
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
