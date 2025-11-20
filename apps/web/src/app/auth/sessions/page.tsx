'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface SessionInfo {
  id: string
  sessionToken: string
  userId: string
  expires: string
  deviceInfo?: any
  ipAddress?: string
  userAgent?: string
  isActive: boolean
  createdAt: string
  lastAccessed: string
}

export default function SessionsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [sessions, setSessions] = useState<SessionInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  useEffect(() => {
    fetchSessions()
  }, [])

  const fetchSessions = async () => {
    try {
      const response = await fetch('/api/auth/sessions')
      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to fetch sessions')
      } else {
        setSessions(data.sessions || [])
      }
    } catch (error) {
      setError('An error occurred while fetching sessions')
    }
  }

  const handleRevokeSession = async (sessionToken: string) => {
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`/api/auth/sessions?token=${sessionToken}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to revoke session')
      } else {
        setSuccess('Session revoked successfully')
        fetchSessions() // Refresh the list
      }
    } catch (error) {
      setError('An error occurred while revoking session')
    } finally {
      setLoading(false)
    }
  }

  const handleRevokeAllOtherSessions = async () => {
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/auth/sessions?allOthers=true', {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to revoke other sessions')
      } else {
        setSuccess('All other sessions revoked successfully')
        fetchSessions() // Refresh the list
      }
    } catch (error) {
      setError('An error occurred while revoking sessions')
    } finally {
      setLoading(false)
    }
  }

  const getDeviceInfo = (userAgent?: string) => {
    if (!userAgent) return { device: 'Unknown', browser: 'Unknown', os: 'Unknown' }

    const ua = userAgent.toLowerCase()
    
    // Browser detection
    let browser = 'Unknown'
    if (ua.includes('chrome')) browser = 'Chrome'
    else if (ua.includes('firefox')) browser = 'Firefox'
    else if (ua.includes('safari')) browser = 'Safari'
    else if (ua.includes('edge')) browser = 'Edge'

    // OS detection
    let os = 'Unknown'
    if (ua.includes('windows')) os = 'Windows'
    else if (ua.includes('mac')) os = 'macOS'
    else if (ua.includes('linux')) os = 'Linux'
    else if (ua.includes('android')) os = 'Android'
    else if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad')) os = 'iOS'

    // Device detection
    let device = 'Desktop'
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      device = 'Mobile'
    } else if (ua.includes('tablet') || ua.includes('ipad')) {
      device = 'Tablet'
    }

    return { device, browser, os }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const isCurrentSession = (sessionToken: string) => {
    // This is a simplified check - in a real app, you'd compare with the current session token
    return sessions.indexOf(sessions.find(s => s.sessionToken === sessionToken)!) === 0
  }

  if (status === 'loading') {
    return <div>Loading...</div>
  }

  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Active Sessions</h1>
              <div className="flex space-x-4">
                <button
                  onClick={handleRevokeAllOtherSessions}
                  disabled={loading || sessions.length <= 1}
                  className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Revoke All Other Sessions
                </button>
                <Link
                  href="/"
                  className="text-blue-600 hover:text-blue-500"
                >
                  Back to Dashboard
                </Link>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-6">
                {success}
              </div>
            )}

            <div className="space-y-4">
              {sessions.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No active sessions found</p>
              ) : (
                sessions.map((sessionItem) => {
                  const deviceInfo = getDeviceInfo(sessionItem.userAgent)
                  const isCurrent = isCurrentSession(sessionItem.sessionToken)
                  
                  return (
                    <div
                      key={sessionItem.id}
                      className={`border rounded-lg p-4 ${isCurrent ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h3 className="text-lg font-medium text-gray-900">
                              {deviceInfo.device} - {deviceInfo.browser}
                            </h3>
                            {isCurrent && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                Current Session
                              </span>
                            )}
                          </div>
                          
                          <div className="mt-2 space-y-1 text-sm text-gray-600">
                            <p>OS: {deviceInfo.os}</p>
                            {sessionItem.ipAddress && <p>IP Address: {sessionItem.ipAddress}</p>}
                            <p>Created: {formatDate(sessionItem.createdAt)}</p>
                            <p>Last Accessed: {formatDate(sessionItem.lastAccessed)}</p>
                            <p>Expires: {formatDate(sessionItem.expires)}</p>
                          </div>
                        </div>
                        
                        <div className="ml-4">
                          {!isCurrent && (
                            <button
                              onClick={() => handleRevokeSession(sessionItem.sessionToken)}
                              disabled={loading}
                              className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 disabled:opacity-50"
                            >
                              Revoke
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}