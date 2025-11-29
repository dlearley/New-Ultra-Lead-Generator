import { NextRequest } from 'next/server'
import { POST } from '@/app/api/auth/register/route'
import { prisma } from '@/lib/prisma'

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}))

jest.mock('@/lib/auth/password', () => ({
  hashPassword: jest.fn().mockResolvedValue('hashed-password'),
  validatePassword: jest.fn(),
}))

describe('/api/auth/register', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('registers a new user successfully', async () => {
    const userData = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'Password123!',
    }

    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)
    ;(require('@/lib/auth/password').validatePassword as jest.Mock).mockReturnValue({
      isValid: true,
      errors: [],
    })
    ;(prisma.user.create as jest.Mock).mockResolvedValue({
      id: 'user-1',
      name: userData.name,
      email: userData.email,
      createdAt: new Date(),
    })

    const request = new NextRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.message).toBe('User created successfully')
    expect(data.user.email).toBe(userData.email)
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        name: userData.name,
        email: userData.email,
        password: 'hashed-password',
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    })
  })

  it('returns error when user already exists', async () => {
    const userData = {
      name: 'Test User',
      email: 'existing@example.com',
      password: 'Password123!',
    }

    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'existing-user',
      email: userData.email,
    })

    const request = new NextRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('User already exists')
    expect(prisma.user.create).not.toHaveBeenCalled()
  })

  it('returns error for invalid password', async () => {
    const userData = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'weak',
    }

    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)
    ;(require('@/lib/auth/password').validatePassword as jest.Mock).mockReturnValue({
      isValid: false,
      errors: ['Password must be at least 8 characters long'],
    })

    const request = new NextRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Password does not meet requirements')
    expect(data.details).toContain('Password must be at least 8 characters long')
    expect(prisma.user.create).not.toHaveBeenCalled()
  })

  it('returns error for invalid input', async () => {
    const invalidData = {
      name: 'T', // Too short
      email: 'invalid-email', // Invalid email
      password: '123', // Too short
    }

    const request = new NextRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(invalidData),
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid input')
    expect(data.details).toBeInstanceOf(Array)
  })
})