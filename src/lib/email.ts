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
// Standard headers for inbox trust (DMARC/SPF best practices)
const EMAIL_HEADERS = {
  'List-Unsubscribe': '<mailto:unsubscribe@intelligenda.it>',
  'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
}
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
  if (b.customerEmail) p.push(r.emails.send({ from: fromAddr, to: b.customerEmail, subject: `Prenotazione confermata — ${s.shopName}`, html: renderBookingConfirmationCustomer(b, s, cu), headers: EMAIL_HEADERS }))
  if (s.shopEmail) p.push(r.emails.send({ from: fromAddr, to: s.shopEmail, subject: `Nuova prenotazione — ${b.customerName} ${b.customerSurname}`, html: renderBookingConfirmationAdmin(b, s) }))
  await Promise.allSettled(p)
}

export async function sendCancellationEmails(b: EmailBookingData, s: ShopData): Promise<void> {
  const r = getResend(); if (!r) return
  const fromAddr = `${getFromName()} <${getFromAddress()}>`
  const p: Promise<unknown>[] = []
  if (b.customerEmail) p.push(r.emails.send({ from: fromAddr, to: b.customerEmail, subject: `Prenotazione annullata — ${s.shopName}`, html: renderCancellationCustomer(b, s), headers: EMAIL_HEADERS }))
  if (s.shopEmail) p.push(r.emails.send({ from: fromAddr, to: s.shopEmail, subject: `Prenotazione annullata — ${b.customerName} ${b.customerSurname}`, html: renderCancellationAdmin(b, s) }))
  await Promise.allSettled(p)
}

export async function sendReminderEmail(b: EmailBookingData, s: ShopData, slug: string): Promise<void> {
  const r = getResend(); if (!r || !b.customerEmail) return
  const fromAddr = `${getFromName()} <${getFromAddress()}>`
  const cu = slug ? `https://${slug}.intelligenda.it/prenota/cancella/${b.bookingId}` : `${process.env.NEXT_PUBLIC_BASE_URL || 'https://intelligenda.it'}/prenota/cancella/${b.bookingId}`
  try { await r.emails.send({ from: fromAddr, to: b.customerEmail, subject: `Promemoria — ${s.shopName}`, html: renderReminder(b, s, cu), headers: EMAIL_HEADERS }) } catch {}
}

// ============ WELCOME EMAIL ============

function renderWelcomeEmail(ownerName: string, businessName: string, slug: string, customBody?: string): string {
  const dashboardUrl = `https://${slug}.intelligenda.it/admin`
  const bodyHtml = customBody
    ? customBody
        .replace(/\{nome\}/gi, ownerName)
        .replace(/\{attivita\}/gi, businessName)
        .replace(/\{slug\}/gi, slug)
        .replace(/\{dashboard\}/gi, dashboardUrl)
        .replace(/\{url\}/gi, `${slug}.intelligenda.it`)
    : `<h2>Ciao ${ownerName}, il tuo account è pronto!</h2><p>Hai appena creato <strong>${businessName}</strong> su IntelliGenda. Ecco 3 passi veloci per iniziare:</p><div class="step"><div class="step-number">1</div><div class="step-content"><h3>Accedi alla tua dashboard</h3><p>Vai su ${slug}.intelligenda.it/admin e accedi con le tue credenziali per gestire il tuo negozio.</p></div></div><div class="step"><div class="step-number">2</div><div class="step-content"><h3>Configura i tuoi servizi</h3><p>Aggiungi i servizi che offri, imposta i prezzi e le durate. I clienti potranno prenotare direttamente online.</p></div></div><div class="step"><div class="step-number">3</div><div class="step-content"><h3>Condividi il link di prenotazione</h3><p>Il tuo link di prenotazione è <strong>${slug}.intelligenda.it</strong>. Condividilo sui social, sul sito o via WhatsApp!</p></div></div><div style="margin-top:28px;text-align:center"><a href="${dashboardUrl}" class="btn">Vai alla Dashboard</a></div><div class="divider"></div><p style="font-size:14px;color:#78716c">Hai bisogno di aiuto? Rispondi a questa email o scrivi a <a href="mailto:support@intelligenda.it" style="color:#1c1917;font-weight:600">support@intelligenda.it</a>.</p>`
  return `<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>Benvenuto su IntelliGenda</title><style>body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}table,td{mso-table-lspace:0pt;mso-table-rspace:0pt}img{-ms-interpolation-mode:bicubic;border:0;outline:none;text-decoration:none}body{margin:0;padding:0;width:100%!important;height:100%!important;background-color:#f5f5f4}.email-container{max-width:600px;margin:0 auto;background-color:#fff;border-radius:12px;overflow:hidden}.header{background:linear-gradient(135deg,#1c1917,#292524);padding:32px 40px;text-align:center}.header h1{margin:0;font-size:24px;font-weight:700;color:#fafaf9;letter-spacing:-0.025em}.header p{margin:8px 0 0;font-size:14px;color:#a8a29e}.content{padding:32px 40px}.content h2{margin:0 0 16px;font-size:20px;font-weight:600;color:#1c1917}.content p{margin:0 0 12px;font-size:15px;line-height:1.6;color:#44403c}.step{display:flex;align-items:flex-start;gap:16px;margin:20px 0;padding:16px;background:#fafaf9;border-radius:8px}.step-number{width:32px;height:32px;min-width:32px;border-radius:50%;background:#1c1917;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px}.step-content h3{margin:0 0 4px;font-size:15px;font-weight:600;color:#1c1917}.step-content p{margin:0;font-size:14px;color:#78716c;line-height:1.5}.btn{display:inline-block;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600;text-decoration:none;text-align:center;background-color:#1c1917;color:#fff}.divider{height:1px;background-color:#e7e5e4;margin:24px 0}.footer{padding:24px 40px;text-align:center;font-size:12px;color:#a8a29e;background-color:#fafaf9}</style></head><body><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0"><tr><td align="center"><div class="email-container"><div class="header"><h1>Benvenuto su IntelliGenda!</h1><p>Il tuo sistema di prenotazioni online</p></div><div class="content">${bodyHtml}</div><div class="footer"><p>Email inviata da <strong>IntelliGenda</strong> — Il sistema di prenotazioni intelligente per la tua attività.</p></div></div></td></tr></table></body></html>`
}

export async function sendWelcomeEmail(ownerName: string, businessName: string, slug: string, ownerEmail: string): Promise<void> {
  const r = getResend()
  if (!r) {
    console.error('[sendWelcomeEmail] Resend not initialized — check RESEND_API_KEY')
    return
  }

  let customSubject: string | undefined
  let customBody: string | undefined

  // Check for custom welcome email settings from PlatformSetting table
  try {
    const { db } = await import('@/lib/db')
    const rows = await db.$queryRawUnsafe<Array<{ key: string; value: string }>>(
      `SELECT "key", "value" FROM "PlatformSetting" WHERE "key" IN ('welcome_email_enabled', 'welcome_email_subject', 'welcome_email_body')`
    )
    const settings: Record<string, string> = {}
    for (const row of rows) settings[row.key] = row.value

    // If welcome_email_enabled is explicitly 'false', skip sending
    if (settings['welcome_email_enabled'] === 'false') {
      console.log('[sendWelcomeEmail] Welcome email disabled via platform settings — skipping')
      return
    }

    if (settings['welcome_email_subject']) {
      customSubject = settings['welcome_email_subject']
        .replace(/\{attivita\}/gi, businessName)
        .replace(/\{nome\}/gi, ownerName)
    }
    if (settings['welcome_email_body']) {
      customBody = settings['welcome_email_body']
    }
  } catch (err) {
    console.warn('[sendWelcomeEmail] Could not load platform settings, using defaults:', err)
  }

  try {
    const result = await r.emails.send({
      from: `${getFromName()} <${getFromAddress()}>`,
      to: ownerEmail,
      subject: customSubject || `Benvenuto su IntelliGenda — ${businessName} è pronto!`,
      html: renderWelcomeEmail(ownerName, businessName, slug, customBody),
      headers: EMAIL_HEADERS,
    })
    console.log('[sendWelcomeEmail] Result:', result)
  } catch (err) {
    console.error('[sendWelcomeEmail] Error:', err)
  }
}

// ============ PASSWORD RESET EMAIL ============

function renderPasswordResetEmail(ownerName: string, resetUrl: string): string {
  return `<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>Reset Password — IntelliGenda</title><style>body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}table,td{mso-table-lspace:0pt;mso-table-rspace:0pt}img{-ms-interpolation-mode:bicubic;border:0;outline:none;text-decoration:none}body{margin:0;padding:0;width:100%!important;height:100%!important;background-color:#f5f5f4}.email-container{max-width:600px;margin:0 auto;background-color:#fff;border-radius:12px;overflow:hidden}.header{background:linear-gradient(135deg,#1c1917,#292524);padding:32px 40px;text-align:center}.header h1{margin:0;font-size:24px;font-weight:700;color:#fafaf9;letter-spacing:-0.025em}.header p{margin:8px 0 0;font-size:14px;color:#a8a29e}.content{padding:32px 40px}.content h2{margin:0 0 16px;font-size:20px;font-weight:600;color:#1c1917}.content p{margin:0 0 12px;font-size:15px;line-height:1.6;color:#44403c}.btn{display:inline-block;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600;text-decoration:none;text-align:center;background-color:#1c1917;color:#fff}.divider{height:1px;background-color:#e7e5e4;margin:24px 0}.footer{padding:24px 40px;text-align:center;font-size:12px;color:#a8a29e;background-color:#fafaf9}</style></head><body><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0"><tr><td align="center"><div class="email-container"><div class="header"><h1>Reset Password</h1><p>IntelliGenda</p></div><div class="content"><h2>Ciao ${ownerName},</h2><p>Hai richiesto di reimpostare la tua password. Clicca sul pulsante qui sotto per procedere:</p><div style="margin-top:24px;text-align:center"><a href="${resetUrl}" class="btn">Reimposta Password</a></div><div class="divider"></div><p style="font-size:14px;color:#78716c">Questo link scade tra 1 ora. Se non hai richiesto il reset, ignora questa email.</p><p style="font-size:14px;color:#78716c">Oppure copia questo link nel browser:</p><p style="font-size:13px;color:#44403c;word-break:break-all">${resetUrl}</p></div><div class="footer"><p>Email inviata da <strong>IntelliGenda</strong> — Il sistema di prenotazioni intelligente per la tua attività.</p></div></div></td></tr></table></body></html>`
}

export async function sendPasswordResetEmail(ownerName: string, ownerEmail: string, slug: string, resetToken: string): Promise<void> {
  const r = getResend()
  if (!r) {
    console.error('[sendPasswordResetEmail] Resend not initialized — check RESEND_API_KEY')
    return
  }
  const resetUrl = `https://${slug}.intelligenda.it/admin/reset-password?token=${resetToken}`
  try {
    const result = await r.emails.send({
      from: `${getFromName()} <${getFromAddress()}>`,
      to: ownerEmail,
      subject: 'Reimposta la tua password — IntelliGenda',
      html: renderPasswordResetEmail(ownerName, resetUrl),
      headers: EMAIL_HEADERS,
    })
    console.log('[sendPasswordResetEmail] Result:', result)
  } catch (err) {
    console.error('[sendPasswordResetEmail] Error:', err)
  }
}

// ============ CUSTOMER WELCOME WITH CREDENTIALS ============

function renderWelcomeWithCredentialsHtml(name: string, email: string, password: string, shopName: string): string {
  return `<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>Benvenuto — ${shopName}</title><style>body{margin:0;padding:0;width:100%;height:100%;background-color:#f5f5f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}.container{max-width:520px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06)}.header{background:linear-gradient(135deg,#1c1917,#292524);padding:40px 32px;text-align:center}.header h1{margin:0;font-size:22px;font-weight:600;color:#fafaf9;letter-spacing:-0.02em}.header p{margin:6px 0 0;font-size:13px;color:#a8a29e}.body{padding:32px}.body h2{margin:0 0 12px;font-size:18px;font-weight:600;color:#1c1917}.body p{margin:0 0 16px;font-size:15px;color:#44403c;line-height:1.6}.cred-box{background:#fafaf9;border:1px solid #e7e5e4;border-radius:12px;padding:20px;margin:20px 0}.cred-row{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #e7e5e4;font-size:14px}.cred-row:last-child{border-bottom:none}.cred-label{color:#78716c;font-weight:500}.cred-value{color:#1c1917;font-weight:600;text-align:right;word-break:break-all}.cred-value.pw{font-family:'SF Mono',Monaco,'Courier New',monospace;letter-spacing:0.02em;font-size:15px}.btn{display:inline-block;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600;text-decoration:none;text-align:center;background-color:#1c1917;color:#fff}.divider{height:1px;background-color:#e7e5e4;margin:24px 0}.footer{padding:24px 32px;text-align:center;font-size:12px;color:#a8a29e;border-top:1px solid #f5f5f4;background:#fafaf9}.note{font-size:13px;color:#78716c;line-height:1.5;background:#fffbeb;border-left:3px solid #f59e0b;padding:12px 16px;border-radius:0 8px 8px 0;margin:16px 0}</style></head><body><div style="padding:24px 0"><div class="container"><div class="header"><h1>Benvenuto!</h1><p>${shopName}</p></div><div class="body"><h2>Ciao ${name}, il tuo account e pronto.</h2><p>Ti sei registrato con successo. Ecco i tuoi dati di accesso:</p><div class="cred-box"><div class="cred-row"><span class="cred-label">Email</span><span class="cred-value">${email}</span></div><div class="cred-row"><span class="cred-label">Password</span><span class="cred-value pw">${password}</span></div></div><div class="note">Conserva questa email per ritrovare facilmente le tue credenziali. Puoi cercarla nella tua casella di posta digitando &quot;IntelliGenda credenziali&quot;.</div><div class="divider"></div><p style="font-size:14px;color:#78716c">Grazie per aver scelto <strong>${shopName}</strong>. Ti aspettiamo!</p></div><div class="footer"><p>IntelliGenda — Prenotazioni intelligenti</p></div></div></div></body></html>`
}

export async function sendWelcomeWithCredentials(name: string, email: string, password: string, shop: { shopName: string }, slug: string): Promise<void> {
  const r = getResend()
  if (!r) {
    console.error('[sendWelcomeWithCredentials] Resend not initialized')
    return
  }
  const fromAddr = `${getFromName()} <${getFromAddress()}>`
  try {
    await r.emails.send({
      from: fromAddr,
      to: email,
      subject: `Benvenuto! — I tuoi dati di accesso | ${shop.shopName}`,
      html: renderWelcomeWithCredentialsHtml(name, email, password, shop.shopName),
      headers: EMAIL_HEADERS,
    })
    console.log('[sendWelcomeWithCredentials] Sent to', email)
  } catch (err) {
    console.error('[sendWelcomeWithCredentials] Error:', err)
  }
}

// ============ CUSTOMER OTP EMAIL (Apple minimal style) ============

function renderOtpEmail(code: string, shopName: string): string {
  return `<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>Il tuo codice IntelliGenda</title><style>body{margin:0;padding:0;width:100%;height:100%;background-color:#f5f5f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}.container{max-width:480px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06)}.header{background:linear-gradient(135deg,#1c1917,#292524);padding:40px 32px;text-align:center}.header h1{margin:0;font-size:20px;font-weight:600;color:#fafaf9;letter-spacing:-0.02em}.header p{margin:6px 0 0;font-size:13px;color:#a8a29e}.body{padding:40px 32px;text-align:center}.body p{margin:0 0 8px;font-size:15px;color:#44403c;line-height:1.5}.code-box{margin:28px auto;padding:20px 16px;background:#fafaf9;border:1px solid #e7e5e4;border-radius:12px;display:inline-block;min-width:200px}.code{font-size:36px;font-weight:700;color:#1c1917;letter-spacing:0.15em;font-variant-numeric:tabular-nums}.expiry{margin:24px 0 0;font-size:13px;color:#78716c}.footer{padding:24px 32px;text-align:center;font-size:12px;color:#a8a29e;border-top:1px solid #f5f5f4;background:#fafaf9}</style></head><body><div style="padding:24px 0"><div class="container"><div class="header"><h1>IntelliGenda</h1><p>${shopName}</p></div><div class="body"><p>Il tuo codice di accesso</p><div class="code-box"><div class="code">${code}</div></div><p class="expiry">Questo codice scade tra 10 minuti.</p><p style="font-size:13px;color:#78716c;margin-top:4px">Se non hai richiesto questo codice, ignora questa email.</p></div><div class="footer"><p>IntelliGenda — Prenotazioni intelligenti</p></div></div></div></body></html>`
}

export async function sendOtpEmail(email: string, code: string, shopName: string): Promise<void> {
  const r = getResend()
  if (!r) {
    console.error('[sendOtpEmail] Resend not initialized')
    return
  }
  try {
    await r.emails.send({
      from: `${getFromName()} <${getFromAddress()}>`,
      to: email,
      subject: `Il tuo codice di accesso IntelliGenda`,
      html: renderOtpEmail(code, shopName),
    })
    console.log('[sendOtpEmail] OTP sent to', email)
  } catch (err) {
    console.error('[sendOtpEmail] Error:', err)
  }
}
