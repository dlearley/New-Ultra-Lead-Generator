import crypto from 'crypto'

export function generateRecoveryCodes(count: number = 10): string[] {
  const codes: string[] = []
  
  for (let i = 0; i < count; i++) {
    // Generate 8-character alphanumeric code in groups of 4
    const bytes = crypto.randomBytes(4)
    const code = bytes.toString('hex').toUpperCase()
    codes.push(`${code.slice(0, 4)}-${code.slice(4)}`)
  }
  
  return codes
}

export function validateRecoveryCode(code: string): boolean {
  // Recovery codes should be in format: XXXX-XXXX
  const pattern = /^[A-F0-9]{4}-[A-F0-9]{4}$/
  return pattern.test(code.toUpperCase())
}