import { render, screen } from '@testing-library/react'
import { SessionProvider } from 'next-auth/react'
import * as React from 'react'

interface MockSession {
  user?: {
    id?: string
    email?: string
    name?: string
    mfaEnabled?: boolean
  }
  expires?: string
}

// Mock session for testing
const createMockSession = (overrides: MockSession = {}) => ({
  user: {
    id: '1',
    email: 'test@example.com',
    name: 'Test User',
    mfaEnabled: false,
    ...overrides.user,
  },
  expires: '2024-12-31T23:59:59.999Z',
  ...overrides,
})

interface TestWrapperProps {
  children: React.ReactNode
  session?: any
}

// Test wrapper with session provider
const TestWrapper = ({ children, session = null }: TestWrapperProps) => (
  <SessionProvider session={session}>
    {children}
  </SessionProvider>
)

export { createMockSession, TestWrapper }