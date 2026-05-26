import { NextRequest, NextResponse } from 'next/server'
import { db, ensureDbSchema } from '@/lib/db'
import { sendPasswordResetEmail } from '@/lib/email'
import { randomUUID } from 'crypto'

/**
 * POST /api/auth/forgot-password
 * Body: { email: string }
 *
 * Anti-enumeration: always returns success regardless of whether the email
 * was found. This prevents attackers from discovering valid emails.
 */
export async function POST(request: NextRequest) {
  try {
    await ensureDbSchema()
    const body = await request.json()
    const email = body.email?.trim()?.toLowerCase()

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { success: true, message: 'Se l\'email è registrata, riceverai un link per reimpostare la password.' },
      )
    }

    // Find tenant by ownerEmail
    const tenant = await db.tenant.findFirst({
      where: { ownerEmail: email },
    })

    if (tenant) {
      // Find admin user for this tenant
      const admin = await db.adminUser.findFirst({
        where: { tenantId: tenant.id },
      })

      if (admin) {
        // Generate reset token
        const token = randomUUID()
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

        await db.adminUser.update({
          where: { id: admin.id },
          data: {
            resetToken: token,
            resetTokenExpires: expiresAt,
          },
        })

        // Send reset email (fire-and-forget)
        sendPasswordResetEmail(
          tenant.ownerName || tenant.businessName,
          email,
          tenant.slug,
          token,
        ).catch((err) => {
          console.error('[forgot-password] Failed to send reset email:', err)
        })
      }
    }

    // Always return success (anti-enumeration)
    return NextResponse.json({
      success: true,
      message: 'Se l\'email è registrata, riceverai un link per reimpostare la password.',
    })
  } catch (error) {
    console.error('POST /api/auth/forgot-password error:', error)
    // Still return success to prevent enumeration
    return NextResponse.json({
      success: true,
      message: 'Se l\'email è registrata, riceverai un link per reimpostare la password.',
    })
  }
}
