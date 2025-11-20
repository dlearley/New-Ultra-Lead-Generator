import twilio from 'twilio'

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
)

export async function sendSmsCode(phoneNumber: string, code: string): Promise<void> {
  if (!process.env.TWILIO_PHONE_NUMBER) {
    throw new Error('Twilio phone number not configured')
  }

  try {
    await client.messages.create({
      body: `Your verification code is: ${code}. This code will expire in 10 minutes.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber,
    })
  } catch (error) {
    console.error('Failed to send SMS:', error)
    throw new Error('Failed to send SMS verification code')
  }
}

export function validatePhoneNumber(phoneNumber: string): boolean {
  // Basic phone number validation - can be enhanced based on requirements
  const phoneRegex = /^\+?[1-9]\d{1,14}$/
  return phoneRegex.test(phoneNumber.replace(/[\s\-\(\)]/g, ''))
}