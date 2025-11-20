import { render, screen } from '@testing-library/react'
import { SessionProvider } from 'next-auth/react'

// Mock session for testing
const createMockSession = (overrides = {}) => ({
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

// Test wrapper with session provider
const TestWrapper = ({ children, session = null }) => (
  <SessionProvider session={session}>
    {children}
  </SessionProvider>
)

export { createMockSession, TestWrapper }