import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../services/prisma.service';

export interface SecuritySettings {
  ipWhitelistEnabled: boolean;
  sessionTimeoutMinutes: number;
  mfaRequired: boolean;
  passwordPolicy: 'basic' | 'strong' | 'enterprise';
  requirePasswordChangeDays: number;
  maxFailedLogins: number;
  lockoutDurationMinutes: number;
  auditLogRetentionDays: number;
  enforceHttps: boolean;
}

@Injectable()
export class SecurityService {
  private readonly logger = new Logger(SecurityService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ============================================================
  // SECURITY SETTINGS
  // ============================================================

  async getSettings(organizationId: string): Promise<SecuritySettings> {
    let settings = await this.prisma.securitySettings.findUnique({
      where: { organizationId },
    });

    if (!settings) {
      // Create default settings
      settings = await this.prisma.securitySettings.create({
        data: {
          organizationId,
          ipWhitelistEnabled: false,
          sessionTimeoutMinutes: 480, // 8 hours
          mfaRequired: false,
          passwordPolicy: 'strong',
          requirePasswordChangeDays: 90,
          maxFailedLogins: 5,
          lockoutDurationMinutes: 30,
          auditLogRetentionDays: 365,
          enforceHttps: true,
        },
      });
    }

    return settings as SecuritySettings;
  }

  async updateSettings(
    organizationId: string,
    data: Partial<SecuritySettings>,
  ): Promise<SecuritySettings> {
    const settings = await this.prisma.securitySettings.upsert({
      where: { organizationId },
      create: {
        organizationId,
        ipWhitelistEnabled: data.ipWhitelistEnabled ?? false,
        sessionTimeoutMinutes: data.sessionTimeoutMinutes ?? 480,
        mfaRequired: data.mfaRequired ?? false,
        passwordPolicy: data.passwordPolicy ?? 'strong',
        requirePasswordChangeDays: data.requirePasswordChangeDays ?? 90,
        maxFailedLogins: data.maxFailedLogins ?? 5,
        lockoutDurationMinutes: data.lockoutDurationMinutes ?? 30,
        auditLogRetentionDays: data.auditLogRetentionDays ?? 365,
        enforceHttps: data.enforceHttps ?? true,
      },
      update: data as any,
    });

    // Log the change
    await this.prisma.auditLog.create({
      data: {
        organizationId,
        action: 'security_settings_updated',
        entityType: 'settings',
        newValues: data,
        category: 'security',
        severity: 'warning',
        status: 'success',
      },
    });

    return settings as SecuritySettings;
  }

  // ============================================================
  // IP WHITELIST MANAGEMENT
  // ============================================================

  async addIpToWhitelist(
    organizationId: string,
    data: {
      ipPattern: string;
      description?: string;
      expiresAt?: Date;
    },
  ) {
    // Validate IP pattern
    if (!this.isValidIpPattern(data.ipPattern)) {
      throw new Error('Invalid IP pattern. Use format: 192.168.1.1 or 192.168.1.0/24 or 192.168.1.*');
    }

    return this.prisma.ipWhitelist.create({
      data: {
        organizationId,
        ipPattern: data.ipPattern,
        description: data.description,
        expiresAt: data.expiresAt,
        isActive: true,
      },
    });
  }

  async removeIpFromWhitelist(organizationId: string, entryId: string): Promise<void> {
    await this.prisma.ipWhitelist.deleteMany({
      where: {
        id: entryId,
        organizationId,
      },
    });
  }

  async getIpWhitelist(organizationId: string) {
    return this.prisma.ipWhitelist.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async toggleIpWhitelistEntry(
    organizationId: string,
    entryId: string,
    isActive: boolean,
  ) {
    return this.prisma.ipWhitelist.updateMany({
      where: {
        id: entryId,
        organizationId,
      },
      data: { isActive },
    });
  }

  private isValidIpPattern(pattern: string): boolean {
    // Check for CIDR notation
    if (pattern.includes('/')) {
      const [ip, bits] = pattern.split('/');
      const mask = parseInt(bits, 10);
      return this.isValidIp(ip) && mask >= 0 && mask <= 32;
    }

    // Check for wildcard
    if (pattern.includes('*')) {
      const regex = /^(\d{1,3}|\*)\.(\d{1,3}|\*)\.(\d{1,3}|\*)\.(\d{1,3}|\*)$/;
      return regex.test(pattern);
    }

    // Must be valid IP
    return this.isValidIp(pattern);
  }

  private isValidIp(ip: string): boolean {
    const regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    if (!regex.test(ip)) return false;

    const parts = ip.split('.').map(Number);
    return parts.every((part) => part >= 0 && part <= 255);
  }

  // ============================================================
  // SESSION MANAGEMENT
  // ============================================================

  async validateSession(
    organizationId: string,
    sessionId: string,
    lastActivityAt: Date,
  ): Promise<{ valid: boolean; reason?: string }> {
    const settings = await this.getSettings(organizationId);

    // Check session timeout
    const sessionAge = Date.now() - lastActivityAt.getTime();
    const maxAge = settings.sessionTimeoutMinutes * 60 * 1000;

    if (sessionAge > maxAge) {
      return { valid: false, reason: 'session_expired' };
    }

    // Check for concurrent session limit (if implemented)
    // This would require tracking active sessions

    return { valid: true };
  }

  async getSessionTimeout(organizationId: string): Promise<number> {
    const settings = await this.getSettings(organizationId);
    return settings.sessionTimeoutMinutes;
  }

  // ============================================================
  // PASSWORD POLICY
  // ============================================================

  validatePassword(password: string, policy: 'basic' | 'strong' | 'enterprise'): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    switch (policy) {
      case 'basic':
        if (password.length < 8) {
          errors.push('Password must be at least 8 characters');
        }
        break;

      case 'strong':
        if (password.length < 12) {
          errors.push('Password must be at least 12 characters');
        }
        if (!/[A-Z]/.test(password)) {
          errors.push('Password must contain uppercase letter');
        }
        if (!/[a-z]/.test(password)) {
          errors.push('Password must contain lowercase letter');
        }
        if (!/[0-9]/.test(password)) {
          errors.push('Password must contain number');
        }
        if (!/[!@#$%^&*]/.test(password)) {
          errors.push('Password must contain special character');
        }
        break;

      case 'enterprise':
        if (password.length < 16) {
          errors.push('Password must be at least 16 characters');
        }
        if (!/[A-Z]/.test(password)) {
          errors.push('Password must contain uppercase letter');
        }
        if (!/[a-z]/.test(password)) {
          errors.push('Password must contain lowercase letter');
        }
        if (!/[0-9]/.test(password)) {
          errors.push('Password must contain number');
        }
        if (!/[!@#$%^&*]/.test(password)) {
          errors.push('Password must contain special character');
        }
        if (/(.)(\1{2,})/.test(password)) {
          errors.push('Password must not contain repeated characters');
        }
        if (/(012|123|234|345|456|567|678|789|890)/.test(password)) {
          errors.push('Password must not contain sequential numbers');
        }
        break;
    }

    return { valid: errors.length === 0, errors };
  }

  // ============================================================
  // ACCOUNT LOCKOUT
  // ============================================================

  async recordFailedLogin(
    organizationId: string,
    email: string,
    ipAddress: string,
  ): Promise<{ locked: boolean; lockoutMinutes?: number }> {
    const settings = await this.getSettings(organizationId);

    // Record the failed attempt
    await this.prisma.failedLoginAttempt.create({
      data: {
        organizationId,
        email,
        ipAddress,
        attemptedAt: new Date(),
      },
    });

    // Count recent failed attempts
    const cutoff = new Date(Date.now() - 60 * 60 * 1000); // Last hour
    const attempts = await this.prisma.failedLoginAttempt.count({
      where: {
        organizationId,
        email,
        attemptedAt: { gte: cutoff },
      },
    });

    if (attempts >= settings.maxFailedLogins) {
      // Lock the account
      await this.prisma.accountLockout.upsert({
        where: {
          organizationId_email: {
            organizationId,
            email,
          },
        },
        create: {
          organizationId,
          email,
          lockedUntil: new Date(Date.now() + settings.lockoutDurationMinutes * 60 * 1000),
          failedAttempts: attempts,
        },
        update: {
          lockedUntil: new Date(Date.now() + settings.lockoutDurationMinutes * 60 * 1000),
          failedAttempts: attempts,
        },
      });

      // Log security event
      await this.prisma.securityEvent.create({
        data: {
          organizationId,
          eventType: 'account_lockout',
          severity: 'high',
          description: `Account locked after ${attempts} failed login attempts`,
          userEmail: email,
          ipAddress,
          status: 'open',
        },
      });

      return { locked: true, lockoutMinutes: settings.lockoutDurationMinutes };
    }

    return { locked: false };
  }

  async isAccountLocked(
    organizationId: string,
    email: string,
  ): Promise<{ locked: boolean; remainingMinutes?: number }> {
    const lockout = await this.prisma.accountLockout.findUnique({
      where: {
        organizationId_email: {
          organizationId,
          email,
        },
      },
    });

    if (!lockout) {
      return { locked: false };
    }

    if (lockout.lockedUntil < new Date()) {
      // Lock has expired
      await this.prisma.accountLockout.delete({
        where: { id: lockout.id },
      });
      return { locked: false };
    }

    const remainingMinutes = Math.ceil(
      (lockout.lockedUntil.getTime() - Date.now()) / (60 * 1000),
    );

    return { locked: true, remainingMinutes };
  }

  async clearFailedAttempts(organizationId: string, email: string): Promise<void> {
    await this.prisma.failedLoginAttempt.deleteMany({
      where: {
        organizationId,
        email,
      },
    });

    // Also clear lockout if exists
    await this.prisma.accountLockout.deleteMany({
      where: {
        organizationId,
        email,
      },
    });
  }

  // ============================================================
  // AUDIT & COMPLIANCE
  // ============================================================

  async getSecurityEvents(
    organizationId: string,
    filters?: {
      severity?: string;
      status?: string;
      startDate?: Date;
      endDate?: Date;
    },
  ) {
    const where: any = { organizationId };

    if (filters?.severity) where.severity = filters.severity;
    if (filters?.status) where.status = filters.status;
    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    return this.prisma.securityEvent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async getSOC2Report(organizationId: string, period: 'monthly' | 'quarterly' = 'monthly') {
    const days = period === 'monthly' ? 30 : 90;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [
      totalEvents,
      criticalEvents,
      highEvents,
      failedLogins,
      ipBlocks,
      accountLockouts,
    ] = await Promise.all([
      this.prisma.securityEvent.count({
        where: { organizationId, createdAt: { gte: since } },
      }),
      this.prisma.securityEvent.count({
        where: { organizationId, severity: 'critical', createdAt: { gte: since } },
      }),
      this.prisma.securityEvent.count({
        where: { organizationId, severity: 'high', createdAt: { gte: since } },
      }),
      this.prisma.failedLoginAttempt.count({
        where: { organizationId, attemptedAt: { gte: since } },
      }),
      this.prisma.securityEvent.count({
        where: { organizationId, eventType: 'ip_blocked', createdAt: { gte: since } },
      }),
      this.prisma.securityEvent.count({
        where: { organizationId, eventType: 'account_lockout', createdAt: { gte: since } },
      }),
    ]);

    return {
      period,
      generatedAt: new Date(),
      summary: {
        totalEvents,
        criticalEvents,
        highEvents,
        failedLogins,
        ipBlocks,
        accountLockouts,
      },
      controls: {
        accessControl: {
          status: criticalEvents === 0 ? 'compliant' : 'review',
          description: 'Access control violations',
        },
        auditLogging: {
          status: 'compliant',
          description: 'Audit log coverage',
        },
        dataProtection: {
          status: 'compliant',
          description: 'Data protection measures',
        },
        incidentResponse: {
          status: highEvents < 10 ? 'compliant' : 'review',
          description: 'Security incident frequency',
        },
      },
    };
  }
}
