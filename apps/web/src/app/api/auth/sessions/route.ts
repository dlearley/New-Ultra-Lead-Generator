import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { getUserSessions, revokeSession, revokeAllOtherSessions } from '@/lib/auth/sessions'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sessions = await getUserSessions(session.user.id)
    return NextResponse.json({ sessions })
  } catch (error) {
    console.error('Sessions error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const sessionToken = searchParams.get('token')
    const allOthers = searchParams.get('allOthers') === 'true'

    if (!sessionToken && !allOthers) {
      return NextResponse.json({ error: 'Session token required' }, { status: 400 })
    }

    if (allOthers) {
      // Revoke all other sessions except the current one
      const currentSessionToken = req.headers.get('authorization')?.replace('Bearer ', '')
      if (currentSessionToken) {
        await revokeAllOtherSessions(currentSessionToken, session.user.id)
      }
    } else if (sessionToken) {
      // Revoke specific session
      await revokeSession(sessionToken, session.user.id)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Revoke session error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}