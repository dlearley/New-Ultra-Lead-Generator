import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import MicrosoftProvider from "next-auth/providers/azure-ad"
import LinkedInProvider from "next-auth/providers/linkedin"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
// Using Prisma adapter for now - Redis adapter can be added for production
import { prisma } from "@/lib/prisma"
import { verifyPassword } from "@/lib/auth/password"
import { generateMfaChallenge, verifyMfaToken } from "@/lib/auth/mfa"
import { refreshTokens } from "@/lib/auth/jwt"

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma), // Use Prisma for database storage
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
    verifyRequest: "/auth/verify-request",
    newUser: "/auth/new-user",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        mfaCode: { label: "MFA Code", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password required")
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })

        if (!user || !user.password) {
          throw new Error("Invalid credentials")
        }

        const isValidPassword = await verifyPassword(credentials.password, user.password)
        if (!isValidPassword) {
          throw new Error("Invalid credentials")
        }

        // MFA verification
        if (user.mfaEnabled) {
          if (!credentials.mfaCode) {
            // Generate MFA challenge
            await generateMfaChallenge(user.id, "totp")
            throw new Error("MFA_REQUIRED")
          }

          const isValidMfa = await verifyMfaToken(user.id, credentials.mfaCode, "totp")
          if (!isValidMfa) {
            throw new Error("Invalid MFA code")
          }
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          mfaEnabled: user.mfaEnabled,
        }
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    MicrosoftProvider({
      clientId: process.env.MICROSOFT_CLIENT_ID!,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
      tenantId: process.env.MICROSOFT_TENANT_ID || "common",
    }),
    LinkedInProvider({
      clientId: process.env.LINKEDIN_CLIENT_ID!,
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      // Initial sign in
      if (user && account) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
        token.mfaEnabled = user.mfaEnabled
        
        // Session storage is handled by Prisma adapter
        // Redis integration can be added for production scaling
      }

      // Refresh token logic
      if (token.refreshToken && Date.now() < (token.accessTokenExpires as number) - 15 * 60 * 1000) {
        try {
          const refreshedTokens = await refreshTokens(token.refreshToken as string)
          token.accessToken = refreshedTokens.accessToken
          token.accessTokenExpires = refreshedTokens.accessTokenExpires
          token.refreshToken = refreshedTokens.refreshToken
        } catch (error) {
          return { ...token, error: "RefreshAccessTokenError" }
        }
      }

      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!
        session.user.mfaEnabled = token.mfaEnabled as boolean
        session.accessToken = token.accessToken as string
        session.error = token.error as string | undefined
      }
      return session
    },
    async signIn({ user, account, profile }) {
      // For OAuth providers, check if user exists and has MFA enabled
      if (account?.provider !== "credentials") {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email! },
        })

        if (dbUser?.mfaEnabled) {
          // Redirect to MFA verification page
          return `/auth/mfa-challenge?provider=${account?.provider}&email=${user.email}`
        }
      }
      return true
    },
  },
  events: {
    async signIn({ user, account, isNewUser }) {
      if (isNewUser && account?.provider !== "credentials") {
        // Create user record for OAuth providers
        await prisma.user.create({
          data: {
            email: user.email!,
            name: user.name,
            image: user.image,
          },
        })
      }
    },
  },
}