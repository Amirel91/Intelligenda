import { NextResponse } from 'next/server'
import { db, ensureDbSchema } from '@/lib/db'
import { sendReminderEmail } from '@/lib/email'

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    const remindSecret = process.env.REMIND_SECRET
    if (remindSecret) { if (!authHeader || authHeader !== `Bearer ${remindSecret}`) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 }) }
    await ensureDbSchema()
    const now = new Date()
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    const bookings = await db.booking.findMany({ where: { status: 'confirmed', startTime: { gte: now, lte: in24Hours }, remindedAt: null, customerEmail: { not: null } }, include: { services: { include: { service: true } }, config: { select: { shopName: true, shopEmail: true, shopPhone: true, shopAddress: true, tenantId: true, tenant: { select: { slug: true } } } }, resource: { select: { id: true, name: true } } }, take: 50 })
    if (bookings.length === 0) return NextResponse.json({ message: 'Nessun reminder', sent: 0 })
    let sent = 0, failed = 0
    for (const booking of bookings) {
      if (!booking.customerEmail) continue
      try {
        await sendReminderEmail({ customerName: booking.customerName, customerSurname: booking.customerSurname, customerEmail: booking.customerEmail, customerPhone: booking.customerPhone, startTime: booking.startTime, endTime: booking.endTime, totalPrice: booking.totalPrice, services: booking.services, resourceName: booking.resource?.name, bookingId: booking.id }, { shopName: booking.config?.shopName || 'Negozio', shopEmail: booking.config?.shopEmail, shopPhone: booking.config?.shopPhone, shopAddress: booking.config?.shopAddress }, booking.config?.tenant?.slug || '')
        await db.booking.update({ where: { id: booking.id }, data: { remindedAt: now } })
        sent++
      } catch { failed++ }
    }
    return NextResponse.json({ message: 'Reminder elaborati', total: bookings.length, sent, failed })
  } catch (error) { return NextResponse.json({ error: 'Errore reminder' }, { status: 500 }) }
}

export async function GET() { return NextResponse.json({ status: 'ok' }) }
