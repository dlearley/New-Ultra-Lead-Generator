import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword, validatePassword } from '@/lib/auth/password'
import { z } from 'zod'

const registerSchema = z.object({
  name: z.string().min(2).max(50),
  email: z.string().email(),
  password: z.string().min(8),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, email, password } = registerSchema.parse(body)

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 })
    }

    // Validate password strength
    const passwordValidation = validatePassword(password)
    if (!passwordValidation.isValid) {
      return NextResponse.json({ 
        error: 'Password does not meet requirements', 
        details: passwordValidation.errors 
      }, { status: 400 })
    }

    // Hash password
    const hashedPassword = await hashPassword(password)

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ 
      message: 'User created successfully',
      user
    }, { status: 201 })
  } catch (error) {
    console.error('Registration error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}