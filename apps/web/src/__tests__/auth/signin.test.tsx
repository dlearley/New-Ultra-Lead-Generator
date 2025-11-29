import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SessionProvider } from 'next-auth/react'
import SignIn from '@/app/auth/signin/page'
import { useRouter } from 'next/navigation'

// Mock NextAuth
jest.mock('next-auth/react', () => ({
  ...jest.requireActual('next-auth/react'),
  signIn: jest.fn(),
  getSession: jest.fn(),
  useSession: jest.fn(),
}))

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

describe('SignIn Page', () => {
  const mockPush = jest.fn()
  const mockSignIn = jest.fn()
  const mockGetSession = jest.fn()

  beforeEach(() => {
    ;(useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    })
    ;(require('next-auth/react').signIn as jest.Mock).mockImplementation(mockSignIn)
    ;(require('next-auth/react').getSession as jest.Mock).mockImplementation(mockGetSession)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('renders sign in form', () => {
    render(
      <SessionProvider>
        <SignIn />
      </SessionProvider>
    )

    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /google/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /microsoft/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /linkedin/i })).toBeInTheDocument()
  })

  it('shows MFA field when MFA is required', async () => {
    mockSignIn.mockResolvedValue({
      error: 'MFA_REQUIRED',
    })

    render(
      <SessionProvider>
        <SignIn />
      </SessionProvider>
    )

    const emailInput = screen.getByLabelText(/email address/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByLabelText(/mfa code/i)).toBeInTheDocument()
      expect(screen.getByText(/please enter your mfa code/i)).toBeInTheDocument()
    })
  })

  it('signs in successfully with valid credentials', async () => {
    const mockSession = {
      user: {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
      },
    }

    mockSignIn.mockResolvedValue({
      ok: true,
    })
    mockGetSession.mockResolvedValue(mockSession)

    render(
      <SessionProvider>
        <SignIn />
      </SessionProvider>
    )

    const emailInput = screen.getByLabelText(/email address/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/')
    })
  })

  it('handles OAuth sign in', async () => {
    render(
      <SessionProvider>
        <SignIn />
      </SessionProvider>
    )

    const googleButton = screen.getByRole('button', { name: /google/i })
    fireEvent.click(googleButton)

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('google', { callbackUrl: '/' })
    })
  })

  it('displays error message on sign in failure', async () => {
    mockSignIn.mockResolvedValue({
      error: 'Invalid credentials',
    })

    render(
      <SessionProvider>
        <SignIn />
      </SessionProvider>
    )

    const emailInput = screen.getByLabelText(/email address/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument()
    })
  })
})