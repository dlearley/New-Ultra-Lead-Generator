import { prisma } from '@/lib/prisma'

// Redis integration can be added for production scaling
// For now, using Prisma for session storage

export interface SessionInfo {
  id: string
  sessionToken: string
  userId: string
  expires: Date
  deviceInfo?: any
  ipAddress?: string
  userAgent?: string
  isActive: boolean
  createdAt: Date
  lastAccessed: Date
}

export async function getUserSessions(userId: string): Promise<SessionInfo[]> {
  // Get sessions from database
  const sessions = await prisma.session.findMany({
    where: { 
      userId,
      isActive: true,
      expires: { gt: new Date() }
    },
    orderBy: { lastAccessed: 'desc' },
  })

  // For now, return sessions as stored in database
  // Redis integration can be added for additional device tracking
  return sessions
}

export async function revokeSession(sessionToken: string, userId: string): Promise<void> {
  // Update session in database
  await prisma.session.updateMany({
    where: { 
      sessionToken,
      userId,
    },
    data: { isActive: false },
  })

  // Redis integration can be added for session invalidation
}

export async function revokeAllOtherSessions(currentSessionToken: string, userId: string): Promise<void> {
  // Deactivate all other sessions
  await prisma.session.updateMany({
    where: { 
      userId,
      sessionToken: { not: currentSessionToken },
      isActive: true,
    },
    data: { isActive: false },
  })

  // Redis integration can be added for additional session cleanup
}

export async function updateSessionActivity(sessionToken: string, deviceInfo?: any): Promise<void> {
  // Update last accessed time
  await prisma.session.update({
    where: { sessionToken },
    data: { lastAccessed: new Date() },
  })

  // Redis integration can be added for device tracking
  // Device info is stored in the database session record
}

export function getDeviceInfo(userAgent?: string): {
  browser?: string
  os?: string
  device?: string
} {
  if (!userAgent) return {}

  const ua = userAgent.toLowerCase()
  
  // Browser detection
  let browser = 'Unknown'
  if (ua.includes('chrome')) browser = 'Chrome'
  else if (ua.includes('firefox')) browser = 'Firefox'
  else if (ua.includes('safari')) browser = 'Safari'
  else if (ua.includes('edge')) browser = 'Edge'

  // OS detection
  let os = 'Unknown'
  if (ua.includes('windows')) os = 'Windows'
  else if (ua.includes('mac')) os = 'macOS'
  else if (ua.includes('linux')) os = 'Linux'
  else if (ua.includes('android')) os = 'Android'
  else if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad')) os = 'iOS'

  // Device detection
  let device = 'Desktop'
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
    device = 'Mobile'
  } else if (ua.includes('tablet') || ua.includes('ipad')) {
    device = 'Tablet'
  }

  return { browser, os, device }
}