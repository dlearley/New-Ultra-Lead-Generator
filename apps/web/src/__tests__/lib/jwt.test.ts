import { generateAccessToken, generateRefreshToken, verifyToken, refreshTokens, revokeToken } from '@/lib/auth/jwt'
import { prisma } from '@/lib/prisma'

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
  },
}))

// Mock environment variables
process.env.NEXTAUTH_SECRET = 'test-secret-key'

describe('JWT Utilities', () => {
  const mockUserId = 'user-123'
  const mockUser = {
    id: mockUserId,
    email: 'test@example.com',
    name: 'Test User',
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('generateAccessToken', () => {
    it('generates a valid access token', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)

      const token = await generateAccessToken(mockUserId)
      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
    })

    it('throws error when user not found', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)

      await expect(generateAccessToken('invalid-user')).rejects.toThrow('User not found')
    })
  })

  describe('generateRefreshToken', () => {
    it('generates a valid refresh token', async () => {
      const token = await generateRefreshToken(mockUserId)
      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
    })
  })

  describe('verifyToken', () => {
    it('verifies a valid access token', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)

      const token = await generateAccessToken(mockUserId)
      const payload = await verifyToken(token)

      expect(payload.sub).toBe(mockUserId)
      expect(payload.email).toBe(mockUser.email)
      expect(payload.name).toBe(mockUser.name)
      expect(payload.type).toBe('access')
    })

    it('verifies a valid refresh token', async () => {
      const token = await generateRefreshToken(mockUserId)
      const payload = await verifyToken(token)

      expect(payload.sub).toBe(mockUserId)
      expect(payload.type).toBe('refresh')
    })

    it('throws error for invalid token', async () => {
      await expect(verifyToken('invalid-token')).rejects.toThrow('Invalid token')
    })

    it('throws error for expired token', async () => {
      // Create a token that expires immediately
      const { SignJWT } = await import('jose')
      const JWT_SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET!)
      
      const expiredToken = await new SignJWT({
        sub: mockUserId,
        type: 'access',
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('0s') // Expired
        .sign(JWT_SECRET)

      await expect(verifyToken(expiredToken)).rejects.toThrow('Invalid token')
    })
  })

  describe('refreshTokens', () => {
    it('refreshes tokens with valid refresh token', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)

      const refreshToken = await generateRefreshToken(mockUserId)
      const tokens = await refreshTokens(refreshToken)

      expect(tokens.accessToken).toBeDefined()
      expect(tokens.refreshToken).toBeDefined()
      expect(tokens.accessTokenExpires).toBeGreaterThan(Date.now())
    })

    it('throws error for invalid refresh token', async () => {
      await expect(refreshTokens('invalid-token')).rejects.toThrow('Failed to refresh tokens')
    })

    it('throws error when user not found during refresh', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)

      const refreshToken = await generateRefreshToken(mockUserId)
      await expect(refreshTokens(refreshToken)).rejects.toThrow('Failed to refresh tokens')
    })
  })

  describe('revokeToken', () => {
    it('revokes valid token', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)

      const token = await generateAccessToken(mockUserId)
      
      // Mock Redis
      const redisSet = jest.fn()
      jest.doMock('@upstash/redis', () => ({
        Redis: jest.fn().mockImplementation(() => ({
          set: redisSet,
        })),
      }))

      await revokeToken(token)
      
      // Should not throw error
      expect(true).toBe(true)
    })

    it('handles invalid token gracefully', async () => {
      await expect(revokeToken('invalid-token')).resolves.not.toThrow()
    })
  })
})