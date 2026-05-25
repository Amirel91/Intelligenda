import { Resend } from 'resend'
import { format, parseISO } from 'date-fns'
import { it } from 'date-fns/locale'

let _resend: Resend | null = null

function getResend(): Resend | null {
  if (_resend) return _resend
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return null
  _resend = new Resend(apiKey)
  return _resend
}

function getFromAddress(): string { return process.env.EMAIL_FROM || 'noreply@intelligenda.it' }
function getFromName(): string { return 'IntelliGenda' }
function formatDate(date: Date | string): string { const d = typeof date === 'string' ? parseISO(date) : date; return format(d, "d MMMM yyyy", { locale: it }) }
function formatTime(date: Date | string): string { const d = typeof date === 'string' ? parseISO(date) : date; return format(d, "HH:mm") }
function formatPrice(price: number): string { return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(price) }
function capitalizeFirst(s: string): string { return s.charAt(0).toUpperCase() + s.slice(1) }

interface EmailBookingData {
  customerName: string; customerSurname: string; customerEmail: string | null; customerPhone: string
  startTime: Date | string; endTime: Date | string; totalPrice: number
  services: Array<{ service: { name: string; price: number; durationMinutes: number } }>
  resourceName?: string | null; bookingId: string
}

interface ShopData { shopName: string; shopEmail?: string | null; shopPhone?: string | null; shopAddress?: string | null }

function baseHtml(shopName: string, subject: string, bodyHtml: string): string {
  return `<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>${subject}</title><style>body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}table,td{mso-table-lspace:0pt;mso-table-rspace:0pt}img{-ms-interpolation-mode:bicubic;border:0;outline:none;text-decoration:none}body{margin:0;padding:0;width:100%!important;height:100%!important;background-color:#f5f5f4}.email-container{max-width:600px;margin:0 auto;background-color:#fff;border-radius:12px;overflow:hidden}.header{background:linear-gradient(135deg,#1c1917,#292524);padding:32px 40px;text-align:center}.header h1{margin:0;font-size:24px;font-weight:700;color:#fafaf9;letter-spacing:-0.025em}.header p{margin:8px 0 0;font-size:14px;color:#a8a29e}.content{padding:32px 40px}.content h2{margin:0 0 16px;font-size:20px;font-weight:600;color:#1c1917}.content p{margin:0 0 12px;font-size:15px;line-height:1.6;color:#44403c}.details{width:100%;border-collapse:collapse;margin:20px 0;background:#fafaf9;border-radius:8px;overflow:hidden}.details td{padding:12px 16px;font-size:14px;color:#44403c;border-bottom:1px solid #e7e5e4}.details tr:last-child td{border-bottom:none}.details td:first-child{font-weight:600;color:#1c1917;width:40%}.service-item{display:flex;justify-content:space-between;padding:10px 16px;border-bottom:1px solid #e7e5e4;font-size:14px;color:#44403c}.service-name{font-weight:500}.service-detail{color:#78716c;font-size:13px}.service-price{font-weight:600;color:#1c1917}.total{display:flex;justify-content:space-between;padding:14px 16px;background:#1c1917;border-radius:8px;margin-top:8px}.total-label,.total-value{font-size:15px;font-weight:700;color:#fafaf9}.btn{display:inline-block;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;text-align:center}.btn-danger{background-color:#dc2626;color:#fff}.divider{height:1px;background-color:#e7e5e4;margin:24px 0}.footer{padding:24px 40px;text-align:center;font-size:12px;color:#a8a29e;background-color:#fafaf9}</style></head><body><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0"><tr><td align="center"><div class="email-container"><div class="header"><h1>${shopName}</h1><p>IntelliGenda</p></div><div class="content">${bodyHtml}</div><div class="footer"><p>Email inviata da <strong>${shopName}</strong> tramite IntelliGenda.</p></div></div></td></tr></table></body></html>`
}

function renderBookingConfirmationCustomer(b: EmailBookingData, s: ShopData, cancelUrl: string): string {
  const rows = b.services.map(sv => `<div class="service-item"><div><div class="service-name">${sv.service.name}</div><div class="service-detail">${sv.service.durationMinutes} min</div></div><div class="service-price">${formatPrice(sv.service.price)}</div></div>`).join('')
  return baseHtml(s.shopName, `Prenotazione confermata — ${s.shopName}`, `<h2>Prenotazione Confermata</h2><p>Ciao <strong>${capitalizeFirst(b.customerName)} ${capitalizeFirst(b.customerSurname)}</strong>,</p><p>La tua prenotazione è confermata:</p><table class="details"><tr><td>Data</td><td>${formatDate(b.startTime)}</td></tr><tr><td>Ora</td><td>${formatTime(b.startTime)} – ${formatTime(b.endTime)}</td></tr>${b.resourceName ? `<tr><td>Operatore</td><td>${b.resourceName}</td></tr>` : ''}</table><div style="background:#fafaf9;border-radius:8px;overflow:hidden">${rows}<div class="total"><span class="total-label">Totale</span><span class="total-value">${formatPrice(b.totalPrice)}</span></div></div><div style="margin-top:24px"><a href="${cancelUrl}" class="btn btn-danger">Annulla Prenotazione</a></div>`)
}

function renderBookingConfirmationAdmin(b: EmailBookingData, s: ShopData): string {
  const list = b.services.map(sv => sv.service.name).join(', ')
  return baseHtml(s.shopName, `Nuova prenotazione — ${s.shopName}`, `<h2>Nuova Prenotazione</h2><table class="details"><tr><td>Cliente</td><td>${capitalizeFirst(b.customerName)} ${capitalizeFirst(b.customerSurname)}</td></tr><tr><td>Email</td><td>${b.customerEmail || 'Non fornita'}</td></tr><tr><td>Telefono</td><td>${b.customerPhone}</td></tr><tr><td>Data</td><td>${formatDate(b.startTime)}</td></tr><tr><td>Ora</td><td>${formatTime(b.startTime)} – ${formatTime(b.endTime)}</td></tr><tr><td>Servizi</td><td>${list}</td></tr><tr><td>Totale</td><td>${formatPrice(b.totalPrice)}</td></tr></table>`)
}

function renderCancellationCustomer(b: EmailBookingData, s: ShopData): string {
  const list = b.services.map(sv => sv.service.name).join(', ')
  return baseHtml(s.shopName, `Prenotazione annullata — ${s.shopName}`, `<h2>Prenotazione Annullata</h2><p>Ciao <strong>${capitalizeFirst(b.customerName)} ${capitalizeFirst(b.customerSurname)}</strong>,</p><p>La tua prenotazione è stata annullata.</p><table class="details"><tr><td>Data</td><td>${formatDate(b.startTime)}</td></tr><tr><td>Servizi</td><td>${list}</td></tr></table>`)
}

function renderCancellationAdmin(b: EmailBookingData, s: ShopData): string {
  const list = b.services.map(sv => sv.service.name).join(', ')
  return baseHtml(s.shopName, `Prenotazione annullata — ${s.shopName}`, `<h2>Prenotazione Annullata dal Cliente</h2><table class="details"><tr><td>Cliente</td><td>${capitalizeFirst(b.customerName)} ${capitalizeFirst(b.customerSurname)}</td></tr><tr><td>Email</td><td>${b.customerEmail || 'Non fornita'}</td></tr><tr><td>Telefono</td><td>${b.customerPhone}</td></tr><tr><td>Data</td><td>${formatDate(b.startTime)}</td></tr><tr><td>Servizi</td><td>${list}</td></tr></table>`)
}

function renderReminder(b: EmailBookingData, s: ShopData, cancelUrl: string): string {
  const list = b.services.map(sv => `${sv.service.name} (${sv.service.durationMinutes} min)`).join(', ')
  return baseHtml(s.shopName, `Promemoria — ${s.shopName}`, `<h2>Promemoria Appuntamento</h2><p>Ciao <strong>${capitalizeFirst(b.customerName)} ${capitalizeFirst(b.customerSurname)}</strong>,</p><p>Ti ricordiamo un appuntamento:</p><table class="details"><tr><td>Data</td><td><strong>${formatDate(b.startTime)}</strong></td></tr><tr><td>Ora</td><td><strong>${formatTime(b.startTime)} – ${formatTime(b.endTime)}</strong></td></tr><tr><td>Servizi</td><td>${list}</td></tr></table><div style="margin-top:20px"><a href="${cancelUrl}" class="btn btn-danger">Annulla</a></div>`)
}

export async function sendBookingConfirmationEmails(b: EmailBookingData, s: ShopData, slug: string): Promise<void> {
  const r = getResend(); if (!r) return
  const fromAddr = `${getFromName()} <${getFromAddress()}>`
  const cu = slug ? `https://${slug}.intelligenda.it/prenota/cancella/${b.bookingId}` : `${process.env.NEXT_PUBLIC_BASE_URL || 'https://intelligenda.it'}/prenota/cancella/${b.bookingId}`
  const p: Promise<unknown>[] = []
  if (b.customerEmail) p.push(r.emails.send({ from: fromAddr, to: b.customerEmail, subject: `Prenotazione confermata — ${s.shopName}`, html: renderBookingConfirmationCustomer(b, s, cu) }))
  if (s.shopEmail) p.push(r.emails.send({ from: fromAddr, to: s.shopEmail, subject: `Nuova prenotazione — ${b.customerName} ${b.customerSurname}`, html: renderBookingConfirmationAdmin(b, s) }))
  await Promise.allSettled(p)
}

export async function sendCancellationEmails(b: EmailBookingData, s: ShopData): Promise<void> {
  const r = getResend(); if (!r) return
  const fromAddr = `${getFromName()} <${getFromAddress()}>`
  const p: Promise<unknown>[] = []
  if (b.customerEmail) p.push(r.emails.send({ from: fromAddr, to: b.customerEmail, subject: `Prenotazione annullata — ${s.shopName}`, html: renderCancellationCustomer(b, s) }))
  if (s.shopEmail) p.push(r.emails.send({ from: fromAddr, to: s.shopEmail, subject: `Prenotazione annullata — ${b.customerName} ${b.customerSurname}`, html: renderCancellationAdmin(b, s) }))
  await Promise.allSettled(p)
}

export async function sendReminderEmail(b: EmailBookingData, s: ShopData, slug: string): Promise<void> {
  const r = getResend(); if (!r || !b.customerEmail) return
  const fromAddr = `${getFromName()} <${getFromAddress()}>`
  const cu = slug ? `https://${slug}.intelligenda.it/prenota/cancella/${b.bookingId}` : `${process.env.NEXT_PUBLIC_BASE_URL || 'https://intelligenda.it'}/prenota/cancella/${b.bookingId}`
  try { await r.emails.send({ from: fromAddr, to: b.customerEmail, subject: `Promemoria — ${s.shopName}`, html: renderReminder(b, s, cu) }) } catch {}
}
