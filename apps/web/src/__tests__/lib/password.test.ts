import { hashPassword, verifyPassword, validatePassword } from '@/lib/auth/password'

describe('Password Utilities', () => {
  describe('validatePassword', () => {
    it('validates a strong password', () => {
      const result = validatePassword('StrongP@ssw0rd!')
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('rejects password that is too short', () => {
      const result = validatePassword('Short1!')
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Password must be at least 8 characters long')
    })

    it('rejects password without uppercase letter', () => {
      const result = validatePassword('lowercase1!')
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Password must contain at least one uppercase letter')
    })

    it('rejects password without lowercase letter', () => {
      const result = validatePassword('UPPERCASE1!')
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Password must contain at least one lowercase letter')
    })

    it('rejects password without number', () => {
      const result = validatePassword('NoNumbers!')
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Password must contain at least one number')
    })

    it('rejects password without special character', () => {
      const result = validatePassword('NoSpecialChars1')
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Password must contain at least one special character')
    })

    it('returns multiple errors for invalid password', () => {
      const result = validatePassword('weak')
      expect(result.isValid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(1)
    })
  })

  describe('hashPassword and verifyPassword', () => {
    it('hashes password correctly', async () => {
      const password = 'TestPassword123!'
      const hashedPassword = await hashPassword(password)
      
      expect(hashedPassword).not.toBe(password)
      expect(hashedPassword.length).toBeGreaterThan(50) // bcrypt hashes are typically 60 chars
    })

    it('verifies correct password', async () => {
      const password = 'TestPassword123!'
      const hashedPassword = await hashPassword(password)
      
      const isValid = await verifyPassword(password, hashedPassword)
      expect(isValid).toBe(true)
    })

    it('rejects incorrect password', async () => {
      const password = 'TestPassword123!'
      const wrongPassword = 'WrongPassword123!'
      const hashedPassword = await hashPassword(password)
      
      const isValid = await verifyPassword(wrongPassword, hashedPassword)
      expect(isValid).toBe(false)
    })

    it('generates different hashes for same password', async () => {
      const password = 'TestPassword123!'
      const hash1 = await hashPassword(password)
      const hash2 = await hashPassword(password)
      
      expect(hash1).not.toBe(hash2)
    })
  })
})