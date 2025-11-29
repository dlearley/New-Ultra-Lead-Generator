'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import QRCode from 'react-qr-code'
import Link from 'next/link'

interface MfaData {
  secret?: string
  qrCode?: string
  backupCodes?: string[]
}

export default function MfaSettings() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [mfaData, setMfaData] = useState<MfaData>({})
  const [verificationCode, setVerificationCode] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showSetup, setShowSetup] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  const handleGenerateSecret = async () => {
    setLoading(true)
    setError('')
    
    try {
      const response = await fetch('/api/auth/mfa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'generate-secret' }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to generate MFA secret')
      } else {
        setMfaData(data)
        setShowSetup(true)
      }
    } catch (error) {
      setError('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleEnableMfa = async () => {
    if (!verificationCode) {
      setError('Please enter verification code')
      return
    }

    setLoading(true)
    setError('')
    
    try {
      const response = await fetch('/api/auth/mfa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          action: 'enable',
          token: verificationCode 
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to enable MFA')
      } else {
        setSuccess('MFA enabled successfully!')
        setMfaData({ backupCodes: data.backupCodes })
        setShowSetup(false)
        setVerificationCode('')
      }
    } catch (error) {
      setError('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleDisableMfa = async () => {
    if (!password) {
      setError('Please enter your password')
      return
    }

    setLoading(true)
    setError('')
    
    try {
      const response = await fetch('/api/auth/mfa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          action: 'disable',
          password 
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to disable MFA')
      } else {
        setSuccess('MFA disabled successfully!')
        setMfaData({})
        setPassword('')
      }
    } catch (error) {
      setError('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading') {
    return <div>Loading...</div>
  }

  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-gray-900">MFA Settings</h1>
              <Link
                href="/"
                className="text-blue-600 hover:text-blue-500"
              >
                Back to Dashboard
              </Link>
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

            <div className="space-y-6">
              {/* Current MFA Status */}
              <div className="border-l-4 border-blue-500 pl-4">
                <h2 className="text-lg font-medium text-gray-900">Current Status</h2>
                <p className="text-gray-600">
                  MFA is currently <span className="font-semibold">{session.user?.mfaEnabled ? 'enabled' : 'disabled'}</span>
                </p>
              </div>

              {/* MFA Setup */}
              {!session.user?.mfaEnabled && (
                <div>
                  <h2 className="text-lg font-medium text-gray-900 mb-4">Enable MFA</h2>
                  
                  {!showSetup ? (
                    <button
                      onClick={handleGenerateSecret}
                      disabled={loading}
                      className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      {loading ? 'Generating...' : 'Enable MFA'}
                    </button>
                  ) : (
                    <div className="space-y-6">
                      {mfaData.qrCode && (
                        <div className="text-center">
                          <p className="text-sm text-gray-600 mb-4">
                            Scan this QR code with your authenticator app:
                          </p>
                          <div className="inline-block p-4 bg-white border rounded-lg">
                            <QRCode value={mfaData.qrCode} size={200} />
                          </div>
                          {mfaData.secret && (
                            <p className="mt-4 text-sm text-gray-600">
                              Or enter this secret manually: <code className="bg-gray-100 px-2 py-1 rounded">{mfaData.secret}</code>
                            </p>
                          )}
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Verification Code
                        </label>
                        <input
                          type="text"
                          maxLength={6}
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value)}
                          placeholder="Enter 6-digit code"
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div className="flex space-x-4">
                        <button
                          onClick={handleEnableMfa}
                          disabled={loading}
                          className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
                        >
                          {loading ? 'Enabling...' : 'Enable MFA'}
                        </button>
                        <button
                          onClick={() => setShowSetup(false)}
                          className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* MFA Disable */}
              {session.user?.mfaEnabled && (
                <div>
                  <h2 className="text-lg font-medium text-gray-900 mb-4">Disable MFA</h2>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Password
                      </label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password to disable MFA"
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <button
                      onClick={handleDisableMfa}
                      disabled={loading}
                      className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50"
                    >
                      {loading ? 'Disabling...' : 'Disable MFA'}
                    </button>
                  </div>
                </div>
              )}

              {/* Backup Codes */}
              {mfaData.backupCodes && (
                <div>
                  <h2 className="text-lg font-medium text-gray-900 mb-4">Backup Codes</h2>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                    <p className="text-sm text-yellow-800 mb-4">
                      Save these backup codes in a safe place. You can use them to access your account if you lose access to your authenticator device.
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {mfaData.backupCodes.map((code, index) => (
                        <code key={index} className="bg-white px-2 py-1 rounded text-sm">
                          {code}
                        </code>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}