// apps/api/src/auth/auth.service.ts
import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../services/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    // Check if user exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, 10);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        organizationId: dto.organizationId,
      },
    });

    // Generate tokens
    const tokens = await this.generateTokens(user.id, user.email);

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  async login(dto: LoginDto) {
    // Find user
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // Check MFA if enabled
    if (user.mfaEnabled) {
      if (!dto.mfaToken) {
        throw new BadRequestException('MFA token required');
      }
      // TODO: Implement TOTP verification
      // const isMfaValid = await this.verifyMfaToken(user.mfaSecret, dto.mfaToken);
      // if (!isMfaValid) {
      //   throw new UnauthorizedException('Invalid MFA token');
      // }
    }

    // Generate tokens
    const tokens = await this.generateTokens(user.id, user.email);

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  async refreshToken(refreshToken: string) {
    // Find refresh token in database
    const tokenRecord = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Delete old refresh token
    await this.prisma.refreshToken.delete({
      where: { id: tokenRecord.id },
    });

    // Generate new tokens
    const tokens = await this.generateTokens(tokenRecord.user.id, tokenRecord.user.email);

    return {
      user: this.sanitizeUser(tokenRecord.user),
      ...tokens,
    };
  }

  async logout(userId: string, refreshToken?: string) {
    // Delete specific refresh token if provided
    if (refreshToken) {
      await this.prisma.refreshToken.deleteMany({
        where: {
          token: refreshToken,
          userId,
        },
      });
    } else {
      // Delete all refresh tokens for user (logout all devices)
      await this.prisma.refreshToken.deleteMany({
        where: { userId },
      });
    }

    return { message: 'Logged out successfully' };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { organization: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return this.sanitizeUser(user);
  }

  private async generateTokens(userId: string, email: string) {
    const payload = { userId, email };

    // Access token (short-lived)
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '15m', // 15 minutes
    });

    // Refresh token (long-lived)
    const refreshTokenString = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '-refresh',
      expiresIn: '7d', // 7 days
    });

    // Store refresh token in database
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        token: refreshTokenString,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken: refreshTokenString,
      expiresIn: 900, // 15 minutes in seconds
    };
  }

  private sanitizeUser(user: any) {
    const { passwordHash, mfaSecret, ...sanitized } = user;
    return sanitized;
  }
}
