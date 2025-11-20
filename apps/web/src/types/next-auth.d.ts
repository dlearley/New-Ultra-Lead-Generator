import { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      mfaEnabled: boolean
    } & DefaultSession['user']
    accessToken?: string
    error?: string
  }

  interface User {
    mfaEnabled: boolean
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    mfaEnabled: boolean
    accessToken?: string
    refreshToken?: string
    accessTokenExpires?: number
    error?: string
  }
}