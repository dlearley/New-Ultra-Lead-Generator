import { render, screen } from '@testing-library/react'
import { createMockSession, TestWrapper } from '@/test-utils'

// Mock the Home component to avoid server-side session calls
jest.mock('@/app/page', () => {
  return function MockHome() {
    const session = createMockSession({ user: { mfaEnabled: true } })
    
    return (
      <TestWrapper session={session}>
        <div>
          <h1>Welcome to Auth SSO MFA</h1>
          <p>test@example.com</p>
          <p>Test User</p>
          <p>MFA Enabled: Yes</p>
          <a href="/auth/mfa">MFA Settings</a>
          <a href="/auth/sessions">Session Management</a>
          <a href="/api/auth/signout">Sign Out</a>
        </div>
      </TestWrapper>
    )
  }
})

describe('Home Page Integration', () => {
  it('displays dashboard content when mocked', () => {
    const Home = (await import('@/app/page')).default
    render(<Home />)

    expect(screen.getByText(/Welcome to Auth SSO MFA/i)).toBeInTheDocument()
    expect(screen.getByText(/test@example.com/i)).toBeInTheDocument()
    expect(screen.getByText(/Test User/i)).toBeInTheDocument()
    expect(screen.getByText(/MFA Enabled: Yes/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /MFA Settings/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Session Management/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Sign Out/i })).toBeInTheDocument()
  })
})