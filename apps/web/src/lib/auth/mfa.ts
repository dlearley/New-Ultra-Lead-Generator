import { authenticator } from 'otplib'
import speakeasy from 'speakeasy'
import qrcode from 'qrcode'
import { prisma } from '@/lib/prisma'
import { generateRecoveryCodes } from './recovery-codes'
import { sendSmsCode } from './sms'
import { sendEmailCode } from './email'

export async function generateTotpSecret(userId: string): Promise<{ secret: string; qrCode: string }> {
  const secret = authenticator.generateSecret()
  
  // Store secret in database
  await prisma.user.update({
    where: { id: userId },
    data: { mfaSecret: secret },
  })

  const issuer = process.env.APP_NAME || 'Auth SSO MFA'
  const user = await prisma.user.findUnique({ where: { id: userId } })
  const label = `${issuer} (${user?.email})`
  
  const otpauthUrl = authenticator.keyuri(user?.email!, issuer, secret)
  const qrCode = await qrcode.toDataURL(otpauthUrl)

  return { secret, qrCode }
}

export async function verifyTotpToken(userId: string, token: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { mfaSecret: true },
  })

  if (!user?.mfaSecret) {
    return false
  }

  try {
    return authenticator.verify({
      token,
      secret: user.mfaSecret,
    })
  } catch (error) {
    return false
  }
}

export async function enableMfa(userId: string, token: string): Promise<{ success: boolean; backupCodes: string[] }> {
  const isValid = await verifyTotpToken(userId, token)
  if (!isValid) {
    throw new Error('Invalid verification code')
  }

  // Generate backup codes
  const backupCodes = generateRecoveryCodes()

  // Enable MFA and store backup codes
  await prisma.user.update({
    where: { id: userId },
    data: {
      mfaEnabled: true,
      backupCodes,
    },
  })

  return { success: true, backupCodes }
}

export async function disableMfa(userId: string, password: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { password: true },
  })

  if (!user?.password) {
    throw new Error('User not found or no password set')
  }

  const { verifyPassword } = await import('./password')
  const isValidPassword = await verifyPassword(password, user.password)
  if (!isValidPassword) {
    throw new Error('Invalid password')
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      mfaEnabled: false,
      mfaSecret: null,
      backupCodes: [],
      phoneNumber: null,
      phoneVerified: false,
    },
  })
}

export async function generateMfaChallenge(userId: string, type: 'totp' | 'sms' | 'email'): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  })

  if (!user) {
    throw new Error('User not found')
  }

  // Clean up existing challenges
  await prisma.mfaChallenge.deleteMany({
    where: { 
      userId, 
      verified: false,
      expires: { lt: new Date() }
    },
  })

  let token: string

  switch (type) {
    case 'sms':
      if (!user.phoneNumber || !user.phoneVerified) {
        throw new Error('Phone number not verified')
      }
      token = Math.floor(100000 + Math.random() * 900000).toString()
      await sendSmsCode(user.phoneNumber, token)
      break
      
    case 'email':
      token = Math.floor(100000 + Math.random() * 900000).toString()
      await sendEmailCode(user.email, token)
      break
      
    case 'totp':
      // For TOTP, we don't generate a token - user uses their authenticator app
      return
      
    default:
      throw new Error('Invalid MFA type')
  }

  // Store challenge
  await prisma.mfaChallenge.create({
    data: {
      userId,
      type,
      token,
      expires: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    },
  })
}

export async function verifyMfaToken(userId: string, token: string, type: 'totp' | 'sms' | 'email'): Promise<boolean> {
  if (type === 'totp') {
    return verifyTotpToken(userId, token)
  }

  // For SMS and email, check against stored challenge
  const challenge = await prisma.mfaChallenge.findFirst({
    where: {
      userId,
      type,
      token,
      verified: false,
      expires: { gt: new Date() },
    },
  })

  if (!challenge) {
    return false
  }

  // Mark challenge as verified
  await prisma.mfaChallenge.update({
    where: { id: challenge.id },
    data: { verified: true },
  })

  return true
}

export async function verifyBackupCode(userId: string, code: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { backupCodes: true },
  })

  if (!user?.backupCodes?.includes(code)) {
    return false
  }

  // Remove the used backup code
  const updatedBackupCodes = user.backupCodes.filter((c: string) => c !== code)
  
  await prisma.user.update({
    where: { id: userId },
    data: { backupCodes: updatedBackupCodes },
  })

  return true
}