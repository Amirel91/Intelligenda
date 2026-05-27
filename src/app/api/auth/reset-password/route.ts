import { NextRequest, NextResponse } from 'next/server'
import { db, ensureDbSchema } from '@/lib/db'
import { hashPassword } from '@/lib/auth'

/**
 * POST /api/auth/reset-password
 * Body: { token: string, password: string }
 */
export async function POST(request: NextRequest) {
  try {
    await ensureDbSchema()
    const body = await request.json()
    const { token, password } = body

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token e nuova password sono obbligatori.' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'La password deve avere almeno 6 caratteri.' },
        { status: 400 }
      )
    }

    // Find admin user by reset token
    const admin = await db.adminUser.findUnique({
      where: { resetToken: token },
      include: { tenant: true },
    })

    if (!admin) {
      return NextResponse.json(
        { error: 'Token non valido o scaduto.' },
        { status: 400 }
      )
    }

    // Check token expiry
    if (!admin.resetTokenExpires || admin.resetTokenExpires < new Date()) {
      // Clear expired token
      await db.adminUser.update({
        where: { id: admin.id },
        data: { resetToken: null, resetTokenExpires: null },
      })
      return NextResponse.json(
        { error: 'Il link è scaduto. Richiedi un nuovo reset della password.' },
        { status: 400 }
      )
    }

    // Hash new password and clear reset token
    const hashedPassword = await hashPassword(password)
    await db.adminUser.update({
      where: { id: admin.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpires: null,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Password aggiornata con successo.',
      slug: admin.tenant?.slug,
    })
  } catch (error) {
    console.error('POST /api/auth/reset-password error:', error)
    return NextResponse.json(
      { error: 'Errore nel reset della password.' },
      { status: 500 }
    )
  }
}
