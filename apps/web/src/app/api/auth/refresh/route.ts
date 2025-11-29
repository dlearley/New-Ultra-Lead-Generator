import { NextRequest, NextResponse } from 'next/server'
import { refreshTokens } from '@/lib/auth/jwt'
import { z } from 'zod'

const refreshSchema = z.object({
  refreshToken: z.string(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { refreshToken } = refreshSchema.parse(body)

    const tokens = await refreshTokens(refreshToken)
    return NextResponse.json(tokens)
  } catch (error) {
    console.error('Token refresh error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to refresh tokens' }, { status: 401 })
  }
}