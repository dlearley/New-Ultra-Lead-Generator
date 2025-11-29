import { NextRequest } from 'next/server'
import { POST } from '@/app/api/auth/mfa-challenge/route'
import { prisma } from '@/lib/prisma'

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
    mfaChallenge: {
      deleteMany: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  },
}))

jest.mock('@/lib/auth/mfa', () => ({
  generateMfaChallenge: jest.fn(),
  verifyMfaToken: jest.fn(),
  verifyBackupCode: jest.fn(),
}))

describe('/api/auth/mfa-challenge', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/auth/mfa-challenge', () => {
    it('generates MFA challenge for OAuth user', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        mfaEnabled: true,
      }

      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)
      ;(require('@/lib/auth/mfa').generateMfaChallenge as jest.Mock).mockResolvedValue(undefined)

      const requestBody = {
        action: 'challenge',
        email: 'test@example.com',
        provider: 'google',
      }

      const request = new NextRequest('http://localhost:3000/api/auth/mfa-challenge', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.requiresMfa).toBe(true)
      expect(require('@/lib/auth/mfa').generateMfaChallenge).toHaveBeenCalledWith('user-1', 'totp')
    })

    it('returns error when MFA not enabled', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        mfaEnabled: false,
      }

      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)

      const requestBody = {
        action: 'challenge',
        email: 'test@example.com',
        provider: 'google',
      }

      const request = new NextRequest('http://localhost:3000/api/auth/mfa-challenge', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('MFA not enabled for this user')
    })

    it('verifies TOTP token successfully', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        mfaEnabled: true,
      }

      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)
      ;(require('@/lib/auth/mfa').verifyMfaToken as jest.Mock).mockResolvedValue(true)

      const requestBody = {
        action: 'verify',
        token: '123456',
        type: 'totp',
        email: 'test@example.com',
      }

      const request = new NextRequest('http://localhost:3000/api/auth/mfa-challenge', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.verified).toBe(true)
      expect(require('@/lib/auth/mfa').verifyMfaToken).toHaveBeenCalledWith('user-1', '123456', 'totp')
    })

    it('verifies backup code successfully', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        mfaEnabled: true,
      }

      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)
      ;(require('@/lib/auth/mfa').verifyBackupCode as jest.Mock).mockResolvedValue(true)

      const requestBody = {
        action: 'verify',
        token: 'ABCD-1234',
        type: 'backup',
        email: 'test@example.com',
      }

      const request = new NextRequest('http://localhost:3000/api/auth/mfa-challenge', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.verified).toBe(true)
      expect(require('@/lib/auth/mfa').verifyBackupCode).toHaveBeenCalledWith('user-1', 'ABCD-1234')
    })

    it('returns error for invalid verification token', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        mfaEnabled: true,
      }

      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)
      ;(require('@/lib/auth/mfa').verifyMfaToken as jest.Mock).mockResolvedValue(false)

      const requestBody = {
        action: 'verify',
        token: '000000',
        type: 'totp',
        email: 'test@example.com',
      }

      const request = new NextRequest('http://localhost:3000/api/auth/mfa-challenge', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid verification code')
    })

    it('returns error for user not found', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)

      const requestBody = {
        action: 'verify',
        token: '123456',
        type: 'totp',
        email: 'nonexistent@example.com',
      }

      const request = new NextRequest('http://localhost:3000/api/auth/mfa-challenge', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('User not found')
    })

    it('returns error for invalid action', async () => {
      const requestBody = {
        action: 'invalid',
        email: 'test@example.com',
      }

      const request = new NextRequest('http://localhost:3000/api/auth/mfa-challenge', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid action')
    })
  })
})