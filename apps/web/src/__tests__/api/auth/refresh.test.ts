import { NextRequest } from 'next/server'
import { POST } from '@/app/api/auth/refresh/route'
import { refreshTokens } from '@/lib/auth/jwt'

// Mock dependencies
jest.mock('@/lib/auth/jwt', () => ({
  refreshTokens: jest.fn(),
}))

describe('/api/auth/refresh', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('refreshes tokens successfully', async () => {
    const mockTokens = {
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
      accessTokenExpires: Date.now() + 15 * 60 * 1000,
    }

    ;(refreshTokens as jest.Mock).mockResolvedValue(mockTokens)

    const requestBody = {
      refreshToken: 'valid-refresh-token',
    }

    const request = new NextRequest('http://localhost:3000/api/auth/refresh', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.accessToken).toBe(mockTokens.accessToken)
    expect(data.refreshToken).toBe(mockTokens.refreshToken)
    expect(data.accessTokenExpires).toBe(mockTokens.accessTokenExpires)
    expect(refreshTokens).toHaveBeenCalledWith('valid-refresh-token')
  })

  it('returns error for invalid refresh token', async () => {
    ;(refreshTokens as jest.Mock).mockRejectedValue(new Error('Invalid token'))

    const requestBody = {
      refreshToken: 'invalid-refresh-token',
    }

    const request = new NextRequest('http://localhost:3000/api/auth/refresh', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Failed to refresh tokens')
  })

  it('returns error for missing refresh token', async () => {
    const requestBody = {
      // Missing refreshToken
    }

    const request = new NextRequest('http://localhost:3000/api/auth/refresh', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid input')
  })

  it('returns error for invalid input format', async () => {
    const requestBody = {
      refreshToken: 123, // Should be string
    }

    const request = new NextRequest('http://localhost:3000/api/auth/refresh', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid input')
  })
})