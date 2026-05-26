import { NextRequest, NextResponse } from 'next/server'
import { db, ensureDbSchema } from '@/lib/db'
import { hashPassword } from '@/lib/auth'
import { sendWelcomeEmail } from '@/lib/email'
import { z } from 'zod'

const VALID_ACTIVITY_TYPES = [
  'ODONTOIATRA','IGIENISTA_DENTALE','FISIOTERAPIA_OSTEOPATA','MEDICO_BASE','DERMATOLOGO','PSICOLOGO','NUTRIZIONISTA',
  'SALONI_CAPELLI','BARBERIA','CENTRO_ESTETICO','MASSAGGI_OLISTICO','TATUAGGI_PIERCING','ONICOTECNICA',
  'AUTOFFICINA','GOMMISTA','LAVAGGIO_AUTO',
  'STUDIO_LEGALE','COMMERCIALISTA','AGENZIA_IMMOBILIARE',
  'TOELETTATURA','VETERINARIO',
  'INSEGNANTE_PRIVATO','PERSONAL_TRAINER',
  'ALTRO',
]

const registerSchema = z.object({
  fullName: z.string().min(2, 'Nome obbligatorio'),
  businessName: z.string().min(2, 'Nome attività obbligatorio'),
  slug: z
    .string()
    .min(3, 'Minimo 3 caratteri')
    .max(30, 'Massimo 30 caratteri')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Solo lettere minuscole, numeri e trattini'),
  email: z.string().email('Email non valida'),
  password: z.string().min(6, 'Minimo 6 caratteri'),
  activityType: z.string().default('ALTRO'),
})

const DOMAIN_BASE = 'intelligenda.it'

/**
 * Register a subdomain on Vercel via API so it routes to this project.
 * Vercel doesn't support wildcard domains in the dashboard — each subdomain
 * must be added individually.
 */
async function registerVercelDomain(subdomain: string): Promise<{ ok: boolean; msg: string }> {
  const token = process.env.VERCEL_API_TOKEN
  const projectId = process.env.VERCEL_PROJECT_ID

  if (!token || !projectId) {
    console.warn('[registerVercelDomain] VERCEL_API_TOKEN or VERCEL_PROJECT_ID not set — skipping domain registration')
    return { ok: false, msg: 'VERCEL_API_TOKEN or VERCEL_PROJECT_ID not configured' }
  }

  try {
    const res = await fetch(
      `https://api.vercel.com/v9/projects/${projectId}/domains`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: `${subdomain}.${DOMAIN_BASE}` }),
      }
    )

    if (res.ok) {
      console.log(`[registerVercelDomain] Registered ${subdomain}.${DOMAIN_BASE} on Vercel`)
      return { ok: true, msg: 'Domain registered' }
    }

    const data = await res.json()
    const errMsg = data.error?.message || data.message || `HTTP ${res.status}`
    console.error(`[registerVercelDomain] Failed: ${errMsg}`)

    // If domain already exists, that's fine — not a blocking error
    if (res.status === 409 || errMsg.includes('already')) {
      return { ok: true, msg: 'Domain already exists' }
    }

    return { ok: false, msg: errMsg }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[registerVercelDomain] Error: ${msg}`)
    return { ok: false, msg }
  }
}

// GET /api/register?slug=xxx - Check slug availability
export async function GET(request: NextRequest) {
  const slug = new URL(request.url).searchParams.get('slug')
  if (!slug || !registerSchema.shape.slug.safeParse(slug).success) {
    return NextResponse.json({ available: false, error: 'Slug non valido' })
  }

  await ensureDbSchema()
  const existing = await db.tenant.findUnique({ where: { slug } })
  return NextResponse.json({ available: !existing })
}

// POST /api/register - Create new tenant + admin + config + register domain on Vercel
export async function POST(request: NextRequest) {
  try {
    await ensureDbSchema()
    const body = await request.json()

    // Check password confirmation
    if (body.confirmPassword && body.password !== body.confirmPassword) {
      return NextResponse.json(
        { error: 'Le password non coincidono' },
        { status: 400 }
      )
    }

    const data = registerSchema.parse(body)

    // Check slug availability
    const existing = await db.tenant.findUnique({ where: { slug: data.slug } })
    if (existing) {
      return NextResponse.json(
        { error: 'Questo indirizzo è già occupato. Scegline un altro.' },
        { status: 409 }
      )
    }

    // Create tenant (starts with trial subscription)
    const tenant = await db.tenant.create({
      data: {
        slug: data.slug,
        businessName: data.businessName,
        ownerName: data.fullName,
        ownerEmail: data.email,
        active: true,
        subscriptionStatus: 'trial',
      },
    })

    // Resolve activity type (fallback to ALTRO if invalid)
    const activityType = VALID_ACTIVITY_TYPES.includes(data.activityType)
      ? data.activityType
      : 'ALTRO'

    // Create business config for this tenant
    const config = await db.businessConfig.create({
      data: {
        tenantId: tenant.id,
        shopName: data.businessName,
        shopDescription: '',
        activityType,
      },
    })

    // Create admin user for this tenant
    const hashedPassword = await hashPassword(data.password)
    await db.adminUser.create({
      data: {
        username: data.slug,
        password: hashedPassword,
        tenantId: tenant.id,
      },
    })

    // Create default working hours (Mon-Fri 9-18, Sat 9-13, Sun closed)
    for (let day = 1; day <= 7; day++) {
      await db.workingHours.create({
        data: {
          configId: config.id,
          dayOfWeek: day,
          openTime: day <= 6 ? '09:00' : '09:00',
          closeTime: day <= 5 ? '18:00' : '13:00',
          closed: day === 7,
        },
      })
    }

    // Register subdomain on Vercel (non-blocking — tenant is created regardless)
    const domainResult = await registerVercelDomain(data.slug)
    if (!domainResult.ok) {
      console.warn(
        `[register] Tenant "${data.slug}" created but domain not registered on Vercel: ${domainResult.msg}`
      )
    }

    // Send welcome email (must await — Vercel kills pending promises after response)
    try {
      await sendWelcomeEmail(data.fullName, data.businessName, data.slug, data.email)
    } catch (err) {
      console.error('[register] Failed to send welcome email:', err)
    }

    return NextResponse.json(
      {
        success: true,
        slug: data.slug,
        url: `https://${data.slug}.${DOMAIN_BASE}`,
        domainRegistered: domainResult.ok,
      },
      { status: 201 }
    )
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'issues' in error) {
      return NextResponse.json({ error: 'Dati non validi', details: error }, { status: 400 })
    }
    console.error('POST /api/register error:', error)
    return NextResponse.json({ error: 'Errore nella registrazione' }, { status: 500 })
  }
}
