import { NextRequest, NextResponse } from 'next/server'
import { db, ensureDbSchema } from '@/lib/db'
import { verifyPassword } from '@/lib/auth'
import { z } from 'zod'

const globalLoginSchema = z.object({
  email: z.string().email('Email non valida'),
  password: z.string().min(6),
})

/**
 * POST /api/auth/global-login
 *
 * Authenticates a tenant admin from the main domain (intelligenda.it/login).
 * Accepts email + password (no slug required — merchants shouldn't need to remember it).
 *
 * Flow:
 *   1. Find tenant by ownerEmail (case-insensitive)
 *   2. Find the admin user linked to that tenant
 *   3. Verify password
 *   4. Return slug + business info → frontend redirects to /account?slug=xxx
 */
export async function POST(request: NextRequest) {
  try {
    await ensureDbSchema()
    const body = await request.json()
    const data = globalLoginSchema.parse(body)

    // Find tenant by owner email (case-insensitive)
    const tenant = await db.tenant.findFirst({
      where: {
        ownerEmail: {
          equals: data.email,
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
        slug: true,
        businessName: true,
        ownerEmail: true,
        active: true,
        subscriptionStatus: true,
        config: { select: { id: true } },
      },
    })

    if (!tenant) {
      return NextResponse.json(
        { error: 'Nessun account trovato con questa email' },
        { status: 404 }
      )
    }

    if (!tenant.active) {
      return NextResponse.json(
        { error: 'Questo account e stato disattivato' },
        { status: 403 }
      )
    }

    if (!tenant.config) {
      return NextResponse.json(
        { error: 'Configurazione non trovata. Contatta il supporto.' },
        { status: 404 }
      )
    }

    // Find any admin user for this tenant
    const user = await db.adminUser.findFirst({
      where: {
        tenantId: tenant.id,
      },
      select: { id: true, username: true, password: true },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Nessun utente admin trovato per questo account' },
        { status: 404 }
      )
    }

    const isValid = await verifyPassword(data.password, user.password)
    if (!isValid) {
      return NextResponse.json(
        { error: 'Credenziali non valide' },
        { status: 401 }
      )
    }

    // Success — return tenant info for redirect to /account
    return NextResponse.json({
      success: true,
      slug: tenant.slug,
      businessName: tenant.businessName,
      subscriptionStatus: tenant.subscriptionStatus,
    })
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'issues' in error) {
      return NextResponse.json({ error: 'Dati non validi' }, { status: 400 })
    }
    console.error('POST /api/auth/global-login error:', error)
    return NextResponse.json({ error: 'Errore di login' }, { status: 500 })
  }
}
