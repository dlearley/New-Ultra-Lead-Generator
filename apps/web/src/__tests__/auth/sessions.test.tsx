import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SessionProvider } from 'next-auth/react'
import SessionsPage from '@/app/auth/sessions/page'
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

// Mock fetch
global.fetch = jest.fn() as jest.Mock

describe('Sessions Page', () => {
  const mockPush = jest.fn()
  const mockSessions = [
    {
      id: '1',
      sessionToken: 'session1',
      userId: '1',
      expires: '2024-12-31T23:59:59Z',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      ipAddress: '192.168.1.1',
      isActive: true,
      createdAt: '2024-01-01T10:00:00Z',
      lastAccessed: '2024-01-01T15:30:00Z',
    },
    {
      id: '2',
      sessionToken: 'session2',
      userId: '1',
      expires: '2024-12-31T23:59:59Z',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Mobile/15E148 Safari/604.1',
      ipAddress: '192.168.1.2',
      isActive: true,
      createdAt: '2024-01-02T09:00:00Z',
      lastAccessed: '2024-01-02T14:00:00Z',
    },
  ]

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
        <SessionsPage />
      </SessionProvider>
    )

    expect(mockPush).toHaveBeenCalledWith('/auth/signin')
  })

  it('displays active sessions when authenticated', async () => {
    const mockSession = {
      data: {
        user: {
          id: '1',
          email: 'test@example.com',
        },
      },
      status: 'authenticated',
    }

    ;(require('next-auth/react').useSession as jest.Mock).mockReturnValue(mockSession)

    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ sessions: mockSessions }),
    })

    render(
      <SessionProvider>
        <SessionsPage />
      </SessionProvider>
    )

    await waitFor(() => {
      expect(screen.getByText(/Active Sessions/i)).toBeInTheDocument()
      expect(screen.getByText(/Desktop - Chrome/i)).toBeInTheDocument()
      expect(screen.getByText(/Mobile - Safari/i)).toBeInTheDocument()
      expect(screen.getByText(/Windows/i)).toBeInTheDocument()
      expect(screen.getByText(/iOS/i)).toBeInTheDocument()
      expect(screen.getByText(/192.168.1.1/i)).toBeInTheDocument()
      expect(screen.getByText(/192.168.1.2/i)).toBeInTheDocument()
    })
  })

  it('revokes a specific session', async () => {
    const mockSession = {
      data: {
        user: {
          id: '1',
          email: 'test@example.com',
        },
      },
      status: 'authenticated',
    }

    ;(require('next-auth/react').useSession as jest.Mock).mockReturnValue(mockSession)

    // Mock initial sessions fetch
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ sessions: mockSessions }),
      })
      // Mock revoke session response
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      })
      // Mock updated sessions fetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ sessions: [mockSessions[0]] }),
      })

    render(
      <SessionProvider>
        <SessionsPage />
      </SessionProvider>
    )

    await waitFor(() => {
      expect(screen.getByText(/Mobile - Safari/i)).toBeInTheDocument()
    })

    // Find and click revoke button for the second session (mobile)
    const revokeButtons = screen.getAllByRole('button', { name: /revoke/i })
    expect(revokeButtons).toHaveLength(1) // Only one revoke button (current session doesn't have one)
    
    fireEvent.click(revokeButtons[0])

    await waitFor(() => {
      expect(screen.getByText(/Session revoked successfully/i)).toBeInTheDocument()
    })
  })

  it('revokes all other sessions', async () => {
    const mockSession = {
      data: {
        user: {
          id: '1',
          email: 'test@example.com',
        },
      },
      status: 'authenticated',
    }

    ;(require('next-auth/react').useSession as jest.Mock).mockReturnValue(mockSession)

    // Mock initial sessions fetch
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ sessions: mockSessions }),
      })
      // Mock revoke all other sessions response
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      })
      // Mock updated sessions fetch (should only have current session)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ sessions: [mockSessions[0]] }),
      })

    render(
      <SessionProvider>
        <SessionsPage />
      </SessionProvider>
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /revoke all other sessions/i })).toBeInTheDocument()
    })

    const revokeAllButton = screen.getByRole('button', { name: /revoke all other sessions/i })
    fireEvent.click(revokeAllButton)

    await waitFor(() => {
      expect(screen.getByText(/All other sessions revoked successfully/i)).toBeInTheDocument()
    })

    // Verify fetch was called with correct parameters
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/auth/sessions?allOthers=true',
      {
        method: 'DELETE',
      }
    )
  })

  it('displays error when fetch fails', async () => {
    const mockSession = {
      data: {
        user: {
          id: '1',
          email: 'test@example.com',
        },
      },
      status: 'authenticated',
    }

    ;(require('next-auth/react').useSession as jest.Mock).mockReturnValue(mockSession)

    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Failed to fetch sessions' }),
    })

    render(
      <SessionProvider>
        <SessionsPage />
      </SessionProvider>
    )

    await waitFor(() => {
      expect(screen.getByText(/Failed to fetch sessions/i)).toBeInTheDocument()
    })
  })
})