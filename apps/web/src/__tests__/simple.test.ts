import { validatePassword } from '@/lib/auth/password'

describe('Simple Tests', () => {
  it('should validate password correctly', () => {
    const result = validatePassword('StrongP@ssw0rd!')
    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('should reject weak password', () => {
    const result = validatePassword('weak')
    expect(result.isValid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })
})