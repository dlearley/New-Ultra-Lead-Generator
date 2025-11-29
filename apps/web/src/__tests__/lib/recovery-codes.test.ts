import { generateRecoveryCodes, validateRecoveryCode } from '@/lib/auth/recovery-codes'

describe('Recovery Codes', () => {
  describe('generateRecoveryCodes', () => {
    it('generates default number of recovery codes', () => {
      const codes = generateRecoveryCodes()
      expect(codes).toHaveLength(10)
    })

    it('generates specified number of recovery codes', () => {
      const codes = generateRecoveryCodes(5)
      expect(codes).toHaveLength(5)
    })

    it('generates unique codes', () => {
      const codes = generateRecoveryCodes(20)
      const uniqueCodes = new Set(codes)
      expect(uniqueCodes.size).toBe(20)
    })

    it('generates codes in correct format', () => {
      const codes = generateRecoveryCodes(1)
      const code = codes[0]
      
      // Should be in format: XXXX-XXXX (8 hex characters in groups of 4)
      expect(code).toMatch(/^[A-F0-9]{4}-[A-F0-9]{4}$/)
    })

    it('generates different codes each time', () => {
      const codes1 = generateRecoveryCodes(5)
      const codes2 = generateRecoveryCodes(5)
      
      expect(codes1).not.toEqual(codes2)
    })
  })

  describe('validateRecoveryCode', () => {
    it('validates correctly formatted recovery code', () => {
      const validCode = 'AB12-CD34'
      expect(validateRecoveryCode(validCode)).toBe(true)
    })

    it('validates lowercase recovery code', () => {
      const lowercaseCode = 'ab12-cd34'
      expect(validateRecoveryCode(lowercaseCode)).toBe(true)
    })

    it('rejects recovery code with incorrect format', () => {
      const invalidCodes = [
        'AB12CD34', // Missing hyphen
        'AB1-CD34', // First group too short
        'AB12-CD3', // Second group too short
        'AB123-CD34', // First group too long
        'AB12-CD345', // Second group too long
        'GH12-IJ34', // Invalid hex characters
        'AB12!CD34', // Special character
        '', // Empty string
        'AB12-CD34-EF56', // Too many groups
      ]

      invalidCodes.forEach(code => {
        expect(validateRecoveryCode(code)).toBe(false)
      })
    })
  })
})