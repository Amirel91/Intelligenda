import { NextRequest, NextResponse } from 'next/server'
import { db, ensureDbSchema } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { bookingSchema } from '@/lib/validations'
import { isSlotAvailable, findFreeResource } from '@/lib/slot-algorithm'
import { getTenantConfig, requireTenantConfig } from '@/lib/tenant'
import { createInRome } from '@/lib/timezone'
import { sendBookingConfirmationEmails, sendWelcomeWithCredentials } from '@/lib/email'
import { getCustomerSession, createCustomerToken, setCustomerSessionCookie } from '@/lib/customer-auth'
import { hashPassword } from '@/lib/auth'

// ============ RATE LIMITING (In-Memory, Anti-Spam) ============
// Max 2 bookings per IP per configId in a 2-hour window
const RATE_LIMIT_WINDOW_MS = 2 * 60 * 60 * 1000 // 2 hours
const RATE_LIMIT_MAX = 2

interface RateLimitEntry {
  count: number
  windowStart: number
}

const rateLimitMap = new Map<string, RateLimitEntry>()

// Clean up expired entries every 10 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitMap) {
    if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
      rateLimitMap.delete(key)
    }
  }
}, 10 * 60 * 1000)

function checkRateLimit(ip: string, configId: string): boolean {
  const key = `${ip}:${configId}`
  const now = Date.now()
  const entry = rateLimitMap.get(key)

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    // Start new window
    rateLimitMap.set(key, { count: 1, windowStart: now })
    return true // allowed
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false // rate limited
  }

  entry.count++
  return true // allowed
}

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}

// GET /api/bookings - Admin: get all bookings
export async function GET(request: NextRequest) {
  try {
    await ensureDbSchema()
    await requireAdmin()

    const config = await requireTenantConfig(request)

    const { searchParams } = new URL(request.url)
    const dateFrom = searchParams.get('from')
    const dateTo = searchParams.get('to')
    const status = searchParams.get('status')

    const where: Record<string, unknown> = { configId: config.id }
    if (dateFrom && dateTo) {
      // Use Rome-aware UTC boundaries for date range filtering
      where.startTime = {
        gte: createInRome(dateFrom.split('T')[0], dateFrom.split('T')[1] || '00:00'),
        lte: createInRome(dateTo.split('T')[0], dateTo.split('T')[1] || '23:59'),
      }
    } else if (dateFrom) {
      where.startTime = { gte: createInRome(dateFrom.split('T')[0], dateFrom.split('T')[1] || '00:00') }
    }
    if (status) {
      where.status = status
    }

    const bookings = await db.booking.findMany({
      where,
      include: {
        services: {
          include: { service: true },
        },
        resource: {
          select: { id: true, name: true },
        },
      },
      orderBy: { startTime: 'asc' },
    })

    return NextResponse.json(bookings)
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }
    if (error instanceof Error && error.message === 'TenantNotFound') {
      return NextResponse.json({ error: 'Negozio non trovato' }, { status: 404 })
    }
    console.error('GET /api/bookings error:', error)
    return NextResponse.json({ error: 'Errore nel caricamento delle prenotazioni' }, { status: 500 })
  }
}

// POST /api/bookings - Public: create booking
export async function POST(request: NextRequest) {
  try {
    await ensureDbSchema()
    const body = await request.json()
    const data = bookingSchema.parse(body)

    const config = await getTenantConfig(request)
    if (!config) {
      return NextResponse.json({ error: 'Negozio non trovato' }, { status: 404 })
    }

    // Rate limiting: max 2 bookings per IP per configId in 2 hours
    const clientIp = getClientIp(request)
    if (!checkRateLimit(clientIp, config.id)) {
      return NextResponse.json(
        { error: 'Troppe prenotazioni ripetute. Riprova tra qualche ora.' },
        { status: 429 }
      )
    }

    // Get services to calculate total price and duration
    const services = await db.service.findMany({
      where: { id: { in: data.serviceIds }, configId: config.id },
    })

    if (services.length !== data.serviceIds.length) {
      return NextResponse.json({ error: 'Uno o più servizi non trovati' }, { status: 400 })
    }

    const totalDuration = services.reduce((sum, s) => sum + s.durationMinutes + (s.cleanupMinutes || 0) + (s.bufferMinutes || 0), 0)
    const totalPrice = services.reduce((sum, s) => sum + s.price, 0)

    // Double-check slot availability (prevent race conditions)
    // If client specified a resourceId, check only that resource's availability
    const available = await isSlotAvailable(data.date, data.time, totalDuration, config.id, data.resourceId)
    if (!available) {
      return NextResponse.json(
        { error: 'Lo slot selezionato non è più disponibile. Si prega di selezionarne un altro.' },
        { status: 409 }
      )
    }

    // Create Date in Europe/Rome timezone (not server UTC)
    const startTime = createInRome(data.date, data.time)
    const endTime = new Date(startTime.getTime() + totalDuration * 60 * 1000)

    // Assign resource: use client's preferred resourceId if provided, otherwise auto-assign
    const resourceId = await findFreeResource(data.date, data.time, totalDuration, config.id, data.resourceId)

    // Check if customer is logged in (optional CustomerUser account)
    const customerSession = await getCustomerSession()
    let customerId: string | undefined

    // Optional registration: if guest provides registerPassword, create account
    const registerPassword = body.registerPassword as string | undefined
    const customerEmail = data.customer.customerEmail?.trim()

    if (!customerSession && registerPassword && customerEmail) {
      // Check if email already registered under this tenant
      const existing = await db.customerUser.findFirst({
        where: { email: customerEmail.toLowerCase(), configId: config.id },
      })

      if (existing) {
        return NextResponse.json(
          { error: 'Questa email e gia registrata. Accedi invece di crearne uno nuovo.' },
          { status: 409 }
        )
      }

      // Hash password and create CustomerUser
      const hashedPassword = await hashPassword(registerPassword)
      const fullName = `${data.customer.customerName} ${data.customer.customerSurname || ''}`.trim()

      try {
        const newCustomer = await db.customerUser.create({
          data: {
            tenantId: config.tenantId,
            configId: config.id,
            nome: fullName,
            telefono: data.customer.customerPhone,
            email: customerEmail.toLowerCase(),
            password: hashedPassword,
          },
        })

        customerId = newCustomer.id

        // Set customer session cookie so user is logged in after registration
        const token = await createCustomerToken({
          customerId: newCustomer.id,
          email: newCustomer.email,
          nome: newCustomer.nome,
          telefono: newCustomer.telefono,
          configId: newCustomer.configId,
          tenantId: newCustomer.tenantId,
        })
        await setCustomerSessionCookie(token)

        // Fire welcome email with credentials (async, non-blocking)
        const tenantSlug = request.cookies.get('tenant_slug')?.value || ''
        sendWelcomeWithCredentials(
          fullName,
          newCustomer.email,
          registerPassword, // plain text for the email
          { shopName: config.shopName },
          tenantSlug
        ).catch(err => console.error('[email] welcome_with_credentials skip:', err))
      } catch (err) {
        console.error('[booking] Failed to create customer account:', err)
        // Don't block booking if account creation fails
      }
    } else if (customerSession && customerSession.configId === config.id) {
      // Already logged in — link booking to existing account
      customerId = customerSession.customerId
      // Update customer profile with latest info (nome, telefono)
      await db.customerUser.update({
        where: { id: customerId },
        data: {
          nome: data.customer.customerName || '',
          telefono: data.customer.customerPhone,
        },
      }).catch(() => { /* best effort — don't block booking */ })
    }

    // Create booking with services
    const booking = await db.booking.create({
      data: {
        customerName: data.customer.customerName,
        customerSurname: data.customer.customerSurname,
        customerPhone: data.customer.customerPhone,
        customerEmail: data.customer.customerEmail || null,
        startTime,
        endTime,
        totalPrice,
        status: 'confirmed',
        configId: config.id,
        ...(resourceId && { resourceId }),
        ...(customerId && { customerId }),
        services: {
          create: data.serviceIds.map((serviceId: string) => ({
            serviceId,
          })),
        },
      },
      include: {
        services: { include: { service: true } },
        resource: { select: { id: true, name: true } },
        config: { select: { shopName: true, shopEmail: true, shopPhone: true, shopAddress: true } },
      },
    })

    const tenantSlug = request.cookies.get('tenant_slug')?.value || ''
    sendBookingConfirmationEmails({ customerName: booking.customerName, customerSurname: booking.customerSurname, customerEmail: booking.customerEmail, customerPhone: booking.customerPhone, startTime: booking.startTime, endTime: booking.endTime, totalPrice: booking.totalPrice, services: booking.services, resourceName: booking.resource?.name, bookingId: booking.id }, { shopName: booking.config?.shopName || config.shopName, shopEmail: booking.config?.shopEmail || config.shopEmail, shopPhone: booking.config?.shopPhone || config.shopPhone, shopAddress: booking.config?.shopAddress || config.shopAddress }, tenantSlug).catch(err => console.error('[email] skip:', err))

    return NextResponse.json({ ...booking, shopName: booking.config?.shopName || config.shopName }, { status: 201 })
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'issues' in error) {
      return NextResponse.json({ error: 'Dati non validi', details: error }, { status: 400 })
    }
    console.error('POST /api/bookings error:', error)
    return NextResponse.json({ error: 'Errore nella creazione della prenotazione' }, { status: 500 })
  }
}
