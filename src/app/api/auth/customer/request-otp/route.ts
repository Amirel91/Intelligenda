import { NextRequest, NextResponse } from 'next/server'
import { db, ensureDbSchema } from '@/lib/db'
import { getTenantConfig } from '@/lib/tenant'
import { sendOtpEmail } from '@/lib/email'

// Rate limiting: max 3 OTP requests per email per 10 minutes
const OTP_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000
const OTP_RATE_LIMIT_MAX = 3

interface RateEntry { count: number; windowStart: number }
const otpRateMap = new Map<string, RateEntry>()

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of otpRateMap) {
    if (now - entry.windowStart > OTP_RATE_LIMIT_WINDOW_MS) otpRateMap.delete(key)
  }
}, 5 * 60 * 1000)

function checkRateLimit(email: string): boolean {
  const key = email.toLowerCase()
  const now = Date.now()
  const entry = otpRateMap.get(key)
  if (!entry || now - entry.windowStart > OTP_RATE_LIMIT_WINDOW_MS) {
    otpRateMap.set(key, { count: 1, windowStart: now })
    return true
  }
  if (entry.count >= OTP_RATE_LIMIT_MAX) return false
  entry.count++
  return true
}

/**
 * POST /api/auth/customer/request-otp
 *
 * Public endpoint for client login.
 * Receives an email, finds or creates a CustomerUser, generates a 6-digit OTP,
 * and sends it via Resend. Rate limited to 3 requests per email per 10 minutes.
 */
export async function POST(request: NextRequest) {
  try {
    await ensureDbSchema()
    const body = await request.json()
    const { email } = body

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

    // Find or create CustomerUser
    let customer = await db.customerUser.findUnique({
      where: { email: normalizedEmail },
    })

    if (!customer) {
      // Create a temporary profile — nome/telefono will be filled when they book
      const tempPhone = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      customer = await db.customerUser.create({
        data: {
          tenantId: config.tenantId,
          configId: config.id,
          email: normalizedEmail,
          telefono: tempPhone,
          nome: '',
        },
      })
    }

    // Generate 6-digit OTP
    const otpCode = String(Math.floor(100000 + Math.random() * 900000))
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    // Save OTP to database
    await db.customerUser.update({
      where: { id: customer.id },
      data: { otpCode, otpExpires },
    })

    // Send OTP email via Resend
    await sendOtpEmail(normalizedEmail, otpCode, config.shopName)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('POST /api/auth/customer/request-otp error:', error)
    return NextResponse.json({ error: 'Errore nell\'invio del codice' }, { status: 500 })
  }
}
