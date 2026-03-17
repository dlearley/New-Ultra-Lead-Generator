'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Session {
  id: string
  device: string
  location: string
  lastActive: string
  current: boolean
}

export default function SessionsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [sessions, setSessions] = useState<Session[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
      return
    }

    if (status === 'authenticated') {
      fetchSessions()
    }
  }, [status, router])

  const fetchSessions = async () => {
    try {
      const res = await fetch('/api/auth/sessions')
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch sessions')
      }
      
      setSessions(data.sessions || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const revokeSession = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/auth/sessions/${sessionId}`, {
        method: 'DELETE'
      })
      
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to revoke session')
      }
      
      setSessions(sessions.filter(s => s.id !== sessionId))
    } catch (err: any) {
      setError(err.message)
    }
  }

  if (status === 'loading' || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Active Sessions</h1>
          <p className="text-gray-600 mt-2">Manage your active sessions</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">{error}</div>
        )}

        <div className="space-y-3">
          {sessions.map((s) => (
            <div key={s.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">{s.device} {s.current && <span className="text-green-600 text-sm">(Current)</span>}</p>
                <p className="text-sm text-gray-600">{s.location}</p>
                <p className="text-xs text-gray-500">Last active: {s.lastActive}</p>
              </div>
              {!s.current && (
                <button
                  onClick={() => revokeSession(s.id)}
                  className="text-red-600 hover:text-red-700 text-sm"
                >
                  Revoke
                </button>
              )}
            </div>
          ))}
        </div>

        {sessions.length === 0 && !isLoading && (
          <div className="text-center text-gray-500 py-8">No active sessions found</div>
        )}

        <div className="text-center">
          <Link href="/dashboard" className="text-blue-600 hover:underline text-sm">Back to Dashboard</Link>
        </div>
      </div>
    </div>
  )
}
