import { generateTotpSecret, verifyTotpToken, enableMfa, disableMfa, generateMfaChallenge, verifyMfaToken, verifyBackupCode } from '@/lib/auth/mfa'
import { prisma } from '@/lib/prisma'

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    mfaChallenge: {
      deleteMany: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  },
}))

jest.mock('@/lib/auth/recovery-codes', () => ({
  generateRecoveryCodes: jest.fn(() => ['CODE1-ABCD', 'CODE2-EFGH']),
}))

jest.mock('@/lib/auth/sms', () => ({
  sendSmsCode: jest.fn(),
}))

jest.mock('@/lib/auth/email', () => ({
  sendEmailCode: jest.fn(),
}))

jest.mock('qrcode', () => ({
  toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,mock-qr-code'),
}))

jest.mock('otplib', () => ({
  authenticator: {
    generateSecret: jest.fn(() => 'JBSWY3DPEHPK3PXP'),
    verify: jest.fn(),
    keyuri: jest.fn(() => 'otpauth://totp/Test:test@example.com?secret=JBSWY3DPEHPK3PXP&issuer=Test'),
  },
}))

describe('MFA Utilities', () => {
  const mockUserId = 'user-123'
  const mockEmail = 'test@example.com'
  const mockUser = {
    id: mockUserId,
    email: mockEmail,
    mfaSecret: 'JBSWY3DPEHPK3PXP',
    mfaEnabled: false,
    backupCodes: [],
    password: 'hashed-password',
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('generateTotpSecret', () => {
    it('generates TOTP secret and QR code', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)
      ;(prisma.user.update as jest.Mock).mockResolvedValue({})

      const result = await generateTotpSecret(mockUserId)

      expect(result.secret).toBe('JBSWY3DPEHPK3PXP')
      expect(result.qrCode).toBe('data:image/png;base64,mock-qr-code')
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: { mfaSecret: 'JBSWY3DPEHPK3PXP' },
      })
    })
  })

  describe('verifyTotpToken', () => {
    it('verifies valid TOTP token', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)
      ;(require('otplib').authenticator.verify as jest.Mock).mockReturnValue(true)

      const result = await verifyTotpToken(mockUserId, '123456')

      expect(result).toBe(true)
      expect(require('otplib').authenticator.verify).toHaveBeenCalledWith({
        token: '123456',
        secret: 'JBSWY3DPEHPK3PXP',
      })
    })

    it('rejects invalid TOTP token', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)
      ;(require('otplib').authenticator.verify as jest.Mock).mockReturnValue(false)

      const result = await verifyTotpToken(mockUserId, '000000')

      expect(result).toBe(false)
    })

    it('throws error when user has no MFA secret', async () => {
      const userWithoutSecret = { ...mockUser, mfaSecret: null }
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(userWithoutSecret)

      const result = await verifyTotpToken(mockUserId, '123456')

      expect(result).toBe(false)
    })
  })

  describe('enableMfa', () => {
    it('enables MFA with valid token', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)
      ;(require('otplib').authenticator.verify as jest.Mock).mockReturnValue(true)
      ;(prisma.user.update as jest.Mock).mockResolvedValue({})

      const result = await enableMfa(mockUserId, '123456')

      expect(result.success).toBe(true)
      expect(result.backupCodes).toEqual(['CODE1-ABCD', 'CODE2-EFGH'])
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: {
          mfaEnabled: true,
          backupCodes: ['CODE1-ABCD', 'CODE2-EFGH'],
        },
      })
    })

    it('throws error for invalid token', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)
      ;(require('otplib').authenticator.verify as jest.Mock).mockReturnValue(false)

      await expect(enableMfa(mockUserId, '000000')).rejects.toThrow('Invalid verification code')
    })
  })

  describe('disableMfa', () => {
    it('disables MFA with valid password', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)
      ;(require('@/lib/auth/password').verifyPassword as jest.Mock).mockResolvedValue(true)
      ;(prisma.user.update as jest.Mock).mockResolvedValue({})

      await disableMfa(mockUserId, 'password123')

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: {
          mfaEnabled: false,
          mfaSecret: null,
          backupCodes: [],
          phoneNumber: null,
          phoneVerified: false,
        },
      })
    })

    it('throws error for invalid password', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)
      ;(require('@/lib/auth/password').verifyPassword as jest.Mock).mockResolvedValue(false)

      await expect(disableMfa(mockUserId, 'wrongpassword')).rejects.toThrow('Invalid password')
    })
  })

  describe('generateMfaChallenge', () => {
    it('generates SMS challenge', async () => {
      const userWithPhone = {
        ...mockUser,
        phoneNumber: '+1234567890',
        phoneVerified: true,
      }
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(userWithPhone)
      ;(prisma.mfaChallenge.deleteMany as jest.Mock).mockResolvedValue({})
      ;(prisma.mfaChallenge.create as jest.Mock).mockResolvedValue({})

      await generateMfaChallenge(mockUserId, 'sms')

      expect(require('@/lib/auth/sms').sendSmsCode).toHaveBeenCalledWith('+1234567890', expect.any(String))
      expect(prisma.mfaChallenge.create).toHaveBeenCalledWith({
        data: {
          userId: mockUserId,
          type: 'sms',
          token: expect.any(String),
          expires: expect.any(Date),
        },
      })
    })

    it('generates email challenge', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)
      ;(prisma.mfaChallenge.deleteMany as jest.Mock).mockResolvedValue({})
      ;(prisma.mfaChallenge.create as jest.Mock).mockResolvedValue({})

      await generateMfaChallenge(mockUserId, 'email')

      expect(require('@/lib/auth/email').sendEmailCode).toHaveBeenCalledWith(mockEmail, expect.any(String))
      expect(prisma.mfaChallenge.create).toHaveBeenCalledWith({
        data: {
          userId: mockUserId,
          type: 'email',
          token: expect.any(String),
          expires: expect.any(Date),
        },
      })
    })

    it('does not generate token for TOTP challenge', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)

      await generateMfaChallenge(mockUserId, 'totp')

      expect(prisma.mfaChallenge.create).not.toHaveBeenCalled()
    })

    it('throws error for SMS without verified phone', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)

      await expect(generateMfaChallenge(mockUserId, 'sms')).rejects.toThrow('Phone number not verified')
    })
  })

  describe('verifyMfaToken', () => {
    it('verifies TOTP token', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)
      ;(require('otplib').authenticator.verify as jest.Mock).mockReturnValue(true)

      const result = await verifyMfaToken(mockUserId, '123456', 'totp')

      expect(result).toBe(true)
    })

    it('verifies SMS challenge token', async () => {
      const mockChallenge = {
        id: 'challenge-1',
        userId: mockUserId,
        type: 'sms',
        token: '123456',
        verified: false,
        expires: new Date(Date.now() + 10 * 60 * 1000),
      }
      ;(prisma.mfaChallenge.findFirst as jest.Mock).mockResolvedValue(mockChallenge)
      ;(prisma.mfaChallenge.update as jest.Mock).mockResolvedValue({})

      const result = await verifyMfaToken(mockUserId, '123456', 'sms')

      expect(result).toBe(true)
      expect(prisma.mfaChallenge.update).toHaveBeenCalledWith({
        where: { id: 'challenge-1' },
        data: { verified: true },
      })
    })

    it('rejects expired challenge token', async () => {
      const expiredChallenge = {
        id: 'challenge-1',
        userId: mockUserId,
        type: 'sms',
        token: '123456',
        verified: false,
        expires: new Date(Date.now() - 10 * 60 * 1000), // Expired
      }
      ;(prisma.mfaChallenge.findFirst as jest.Mock).mockResolvedValue(expiredChallenge)

      const result = await verifyMfaToken(mockUserId, '123456', 'sms')

      expect(result).toBe(false)
    })
  })

  describe('verifyBackupCode', () => {
    it('verifies and removes valid backup code', async () => {
      const userWithBackupCodes = {
        ...mockUser,
        backupCodes: ['CODE1-ABCD', 'CODE2-EFGH'],
      }
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(userWithBackupCodes)
      ;(prisma.user.update as jest.Mock).mockResolvedValue({})

      const result = await verifyBackupCode(mockUserId, 'CODE1-ABCD')

      expect(result).toBe(true)
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: { backupCodes: ['CODE2-EFGH'] },
      })
    })

    it('rejects invalid backup code', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)

      const result = await verifyBackupCode(mockUserId, 'INVALID-CODE')

      expect(result).toBe(false)
      expect(prisma.user.update).not.toHaveBeenCalled()
    })
  })
})