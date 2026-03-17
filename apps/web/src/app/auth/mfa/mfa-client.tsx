'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
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
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  const handleSetup = async () => {
    setIsLoading(true)
    setError('')
    
    try {
      const res = await fetch('/api/auth/mfa-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to setup MFA')
      }
      
      setMfaData(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerify = async () => {
    setIsLoading(true)
    setError('')
    
    try {
      const res = await fetch('/api/auth/mfa-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: verificationCode })
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || 'Invalid verification code')
      }
      
      setSuccess('MFA enabled successfully!')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDisable = async () => {
    setIsLoading(true)
    setError('')
    
    try {
      const res = await fetch('/api/auth/mfa-disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      })
      
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to disable MFA')
      }
      
      setSuccess('MFA disabled successfully!')
      setMfaData({})
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Multi-Factor Authentication</h1>
          <p className="text-gray-600 mt-2">Secure your account with MFA</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">{error}</div>
        )}

        {success && (
          <div className="bg-green-50 text-green-600 p-3 rounded-md text-sm">{success}</div>
        )}

        {!mfaData.secret ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-2 border rounded-md"
                placeholder="Enter your password"
              />
            </div>
            
            <button
              onClick={handleSetup}
              disabled={isLoading || !password}
              className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Setting up...' : 'Setup MFA'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">Scan this QR code with your authenticator app:</p>
              <div className="flex justify-center">
                <div className="p-4 bg-white rounded-lg">
                  <p className="text-sm">Secret: {mfaData.secret}</p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Verification Code</label>
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                className="w-full p-2 border rounded-md"
                placeholder="Enter 6-digit code"
              />
            </div>

            <button
              onClick={handleVerify}
              disabled={isLoading || verificationCode.length !== 6}
              className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Verifying...' : 'Verify & Enable'}
            </button>

            {mfaData.backupCodes && mfaData.backupCodes.length > 0 && (
              <div className="bg-yellow-50 p-4 rounded-md">
                <h3 className="font-semibold mb-2">Backup Codes</h3>
                <p className="text-sm text-gray-600 mb-2">Save these codes securely:</p>
                <div className="grid grid-cols-2 gap-2">
                  {mfaData.backupCodes.map((code, i) => (
                    <code key={i} className="bg-white p-1 rounded text-center">{code}</code>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="text-center">
          <Link href="/dashboard" className="text-blue-600 hover:underline text-sm">Back to Dashboard</Link>
        </div>
      </div>
    </div>
  )
}
