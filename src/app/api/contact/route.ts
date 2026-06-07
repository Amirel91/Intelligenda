import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const RESEND_API_KEY = process.env.RESEND_API_KEY
const CONTACT_EMAIL = 'info@intelligenda.it'
const FROM_ADDRESS = process.env.EMAIL_FROM || 'noreply@intelligenda.it'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, phone, message } = body

    // Validate required fields
    if (!email || !message) {
      return NextResponse.json({ error: 'Email e messaggio sono obbligatori' }, { status: 400 })
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json({ error: 'Email non valida' }, { status: 400 })
    }

    if (message.trim().length < 10) {
      return NextResponse.json({ error: 'Il messaggio è troppo breve' }, { status: 400 })
    }

    // Send email via Resend
    if (RESEND_API_KEY) {
      const resend = new Resend(RESEND_API_KEY)

      const phoneLine = phone ? `<tr><td><strong>Telefono</strong></td><td>${phone}</td></tr>` : ''

      const html = `<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>Richiesta di contatto — IntelliGenda</title><style>body{margin:0;padding:0;background:#f5f5f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}.container{max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06)}.header{background:linear-gradient(135deg,#1c1917,#292524);padding:28px 32px;text-align:center}.header h1{margin:0;font-size:20px;font-weight:700;color:#fafaf9}.header p{margin:6px 0 0;font-size:13px;color:#a8a29e}.body{padding:28px 32px}.body table{width:100%;border-collapse:collapse;margin:16px 0}.body td{padding:10px 0;font-size:14px;color:#44403c;border-bottom:1px solid #e7e5e4;vertical-align:top}.body tr:last-child td{border-bottom:none}.body td:first-child{font-weight:600;color:#1c1917;width:30%}.message-box{background:#fafaf9;border:1px solid #e7e5e4;border-radius:8px;padding:16px;margin-top:16px;font-size:14px;color:#44403c;line-height:1.6;white-space:pre-wrap}.footer{padding:20px 32px;text-align:center;font-size:12px;color:#a8a29e;border-top:1px solid #e7e5e4;background:#fafaf9}</style></head><body><div style="padding:24px 0"><div class="container"><div class="header"><h1>Nuova richiesta di contatto</h1><p>IntelliGenda</p></div><div class="body"><table><tr><td><strong>Email</strong></td><td>${email}</td></tr>${phoneLine}</table><div class="message-box">${message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div></div><div class="footer"><p>IntelliGenda — Prenotazioni intelligenti</p></div></div></div></body></html>`

      await resend.emails.send({
        from: `IntelliGenda <${FROM_ADDRESS}>`,
        to: CONTACT_EMAIL,
        replyTo: email,
        subject: `Richiesta di contatto da ${email}`,
        html,
      })
    } else {
      console.error('[contact] RESEND_API_KEY not set — logging contact form submission instead')
      console.log('[contact] Email:', email, 'Phone:', phone || 'N/A', 'Message:', message)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[contact] Error:', err)
    return NextResponse.json({ error: 'Errore nell\'invio del messaggio. Riprova.' }, { status: 500 })
  }
}
