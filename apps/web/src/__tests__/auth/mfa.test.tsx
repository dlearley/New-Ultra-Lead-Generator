import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SessionProvider } from 'next-auth/react'
import MfaSettings from '@/app/auth/mfa/page'
import { useRouter } from 'next/navigation'

// Mock NextAuth
jest.mock('next-auth/react', () => ({
  ...jest.requireActual('next-auth/react'),
  useSession: jest.fn(),
}))

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

// Mock QRCode component
jest.mock('react-qr-code', () => {
  return function MockQRCode({ value }: { value: string }) {
    return <div data-testid="qr-code">{value}</div>
  }
})

// Mock fetch
global.fetch = jest.fn() as jest.Mock

describe('MFA Settings', () => {
  const mockPush = jest.fn()

  beforeEach(() => {
    ;(useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    })
    ;(global.fetch as jest.Mock).mockClear()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('redirects to sign in when not authenticated', () => {
    ;(require('next-auth/react').useSession as jest.Mock).mockReturnValue({
      data: null,
      status: 'unauthenticated',
    })

    render(
      <SessionProvider>
        <MfaSettings />
      </SessionProvider>
    )

    expect(mockPush).toHaveBeenCalledWith('/auth/signin')
  })

  it('shows MFA status when authenticated', () => {
    ;(require('next-auth/react').useSession as jest.Mock).mockReturnValue({
      data: {
        user: {
          id: '1',
          email: 'test@example.com',
          mfaEnabled: false,
        },
      },
      status: 'authenticated',
    })

    render(
      <SessionProvider>
        <MfaSettings />
      </SessionProvider>
    )

    expect(screen.getByText(/MFA is currently disabled/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /enable mfa/i })).toBeInTheDocument()
  })

  it('generates MFA secret when enable button is clicked', async () => {
    const mockSession = {
      data: {
        user: {
          id: '1',
          email: 'test@example.com',
          mfaEnabled: false,
        },
      },
      status: 'authenticated',
    }

    ;(require('next-auth/react').useSession as jest.Mock).mockReturnValue(mockSession)

    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        secret: 'JBSWY3DPEHPK3PXP',
        qrCode: 'otpauth://totp/Test:test@example.com?secret=JBSWY3DPEHPK3PXP&issuer=Test',
      }),
    })

    render(
      <SessionProvider>
        <MfaSettings />
      </SessionProvider>
    )

    const enableButton = screen.getByRole('button', { name: /enable mfa/i })
    fireEvent.click(enableButton)

    await waitFor(() => {
      expect(screen.getByTestId('qr-code')).toBeInTheDocument()
      expect(screen.getByLabelText(/verification code/i)).toBeInTheDocument()
    })
  })

  it('enables MFA with valid verification code', async () => {
    const mockSession = {
      data: {
        user: {
          id: '1',
          email: 'test@example.com',
          mfaEnabled: false,
        },
      },
      status: 'authenticated',
    }

    ;(require('next-auth/react').useSession as jest.Mock).mockReturnValue(mockSession)

    // Mock generate secret response
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          secret: 'JBSWY3DPEHPK3PXP',
          qrCode: 'otpauth://totp/Test:test@example.com?secret=JBSWY3DPEHPK3PXP&issuer=Test',
        }),
      })
      // Mock enable MFA response
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          backupCodes: ['ABCD-1234', 'EFGH-5678'],
        }),
      })

    render(
      <SessionProvider>
        <MfaSettings />
      </SessionProvider>
    )

    // First click to generate secret
    const enableButton = screen.getByRole('button', { name: /enable mfa/i })
    fireEvent.click(enableButton)

    await waitFor(() => {
      expect(screen.getByLabelText(/verification code/i)).toBeInTheDocument()
    })

    // Enter verification code and enable MFA
    const verificationInput = screen.getByLabelText(/verification code/i)
    fireEvent.change(verificationInput, { target: { value: '123456' } })

    const confirmButton = screen.getByRole('button', { name: /enable mfa/i })
    fireEvent.click(confirmButton)

    await waitFor(() => {
      expect(screen.getByText(/MFA enabled successfully/i)).toBeInTheDocument()
      expect(screen.getByText(/ABCD-1234/i)).toBeInTheDocument()
      expect(screen.getByText(/EFGH-5678/i)).toBeInTheDocument()
    })
  })

  it('disables MFA with valid password', async () => {
    const mockSession = {
      data: {
        user: {
          id: '1',
          email: 'test@example.com',
          mfaEnabled: true,
        },
      },
      status: 'authenticated',
    }

    ;(require('next-auth/react').useSession as jest.Mock).mockReturnValue(mockSession)

    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    })

    render(
      <SessionProvider>
        <MfaSettings />
      </SessionProvider>
    )

    expect(screen.getByText(/MFA is currently enabled/i)).toBeInTheDocument()

    const passwordInput = screen.getByLabelText(/password/i)
    fireEvent.change(passwordInput, { target: { value: 'password123' } })

    const disableButton = screen.getByRole('button', { name: /disable mfa/i })
    fireEvent.click(disableButton)

    await waitFor(() => {
      expect(screen.getByText(/MFA disabled successfully/i)).toBeInTheDocument()
    })
  })
})