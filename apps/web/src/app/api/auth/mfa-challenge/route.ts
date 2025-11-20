import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateMfaChallenge, verifyMfaToken, verifyBackupCode } from '@/lib/auth/mfa'
import { z } from 'zod'

const challengeSchema = z.object({
  email: z.string().email(),
  provider: z.enum(['google', 'microsoft', 'linkedin']),
})

const verifySchema = z.object({
  token: z.string(),
  type: z.enum(['totp', 'sms', 'email', 'backup']),
  email: z.string().email(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const action = body.action

    if (action === 'challenge') {
      const { email, provider } = challengeSchema.parse(body)
      
      const user = await prisma.user.findUnique({
        where: { email },
      })

      if (!user || !user.mfaEnabled) {
        return NextResponse.json({ error: 'MFA not enabled for this user' }, { status: 400 })
      }

      // Generate TOTP challenge (user will use their authenticator app)
      await generateMfaChallenge(user.id, 'totp')
      
      return NextResponse.json({ 
        message: 'MFA challenge generated',
        requiresMfa: true 
      })
    }

    if (action === 'verify') {
      const { token, type, email } = verifySchema.parse(body)
      
      const user = await prisma.user.findUnique({
        where: { email },
      })

      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }

      let isValid = false

      if (type === 'backup') {
        isValid = await verifyBackupCode(user.id, token)
      } else {
        isValid = await verifyMfaToken(user.id, token, type as 'totp' | 'sms' | 'email')
      }

      if (!isValid) {
        return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 })
      }

      return NextResponse.json({ 
        message: 'MFA verification successful',
        verified: true 
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('MFA challenge error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}