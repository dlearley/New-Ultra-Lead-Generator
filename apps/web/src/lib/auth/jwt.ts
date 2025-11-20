import { SignJWT, jwtVerify } from 'jose'
import { prisma } from '@/lib/prisma'

const JWT_SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET!)

export interface JWTPayload extends Record<string, unknown> {
  sub: string
  email?: string
  name?: string
  iat?: number
  exp?: number
  type: 'access' | 'refresh'
}

export async function generateAccessToken(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  })

  if (!user) {
    throw new Error('User not found')
  }

  return await new SignJWT({
    sub: userId,
    email: user.email,
    name: user.name,
    type: 'access',
  } as JWTPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m') // Access tokens expire in 15 minutes
    .sign(JWT_SECRET)
}

export async function generateRefreshToken(userId: string): Promise<string> {
  return await new SignJWT({
    sub: userId,
    type: 'refresh',
  } as JWTPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d') // Refresh tokens expire in 7 days
    .sign(JWT_SECRET)
}

export async function verifyToken(token: string): Promise<JWTPayload> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as unknown as JWTPayload
  } catch (error) {
    throw new Error('Invalid token')
  }
}

export async function refreshTokens(refreshToken: string): Promise<{
  accessToken: string
  refreshToken: string
  accessTokenExpires: number
}> {
  try {
    // Verify the refresh token
    const payload = await verifyToken(refreshToken)
    
    if (payload.type !== 'refresh') {
      throw new Error('Invalid token type')
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
    })

    if (!user) {
      throw new Error('User not found')
    }

    // Generate new tokens
    const newAccessToken = await generateAccessToken(payload.sub)
    const newRefreshToken = await generateRefreshToken(payload.sub)
    
    // Store refresh token in database for rotation
    // In a real implementation, you might want to track token families
    // and invalidate old tokens when new ones are issued
    
    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      accessTokenExpires: Date.now() + 15 * 60 * 1000, // 15 minutes
    }
  } catch (error) {
    throw new Error('Failed to refresh tokens')
  }
}

export async function revokeToken(token: string): Promise<void> {
  // In a real implementation, you would add the token to a blacklist
  // For now, we'll just verify it's valid and then rely on expiration
  try {
    await verifyToken(token)
  } catch (error) {
    // Token is already invalid
    return
  }
  
  // TODO: Implement token blacklisting using Redis or database
  // For now, tokens are only invalidated through expiration
}