import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { generateTotpSecret, enableMfa, disableMfa } from '@/lib/auth/mfa'
import { z } from 'zod'

const enableMfaSchema = z.object({
  token: z.string().length(6),
})

const disableMfaSchema = z.object({
  password: z.string().min(8),
})

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const action = body.action

    if (action === 'generate-secret') {
      const { secret, qrCode } = await generateTotpSecret(session.user.id)
      return NextResponse.json({ secret, qrCode })
    }

    if (action === 'enable') {
      const { token } = enableMfaSchema.parse(body)
      const result = await enableMfa(session.user.id, token)
      return NextResponse.json(result)
    }

    if (action === 'disable') {
      const { password } = disableMfaSchema.parse(body)
      await disableMfa(session.user.id, password)
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('MFA error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}