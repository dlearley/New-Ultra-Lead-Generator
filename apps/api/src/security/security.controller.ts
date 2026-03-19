import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SecurityService } from './security.service';
import { IpWhitelistGuard } from './guards/ip-whitelist.guard';

interface UserPayload {
  userId: string;
  email: string;
  organizationId: string;
  role?: string;
}

@Controller('security')
@UseGuards(JwtAuthGuard)
export class SecurityController {
  constructor(private readonly security: SecurityService) {}

  // ============================================================
  // SECURITY SETTINGS
  // ============================================================

  @Get('settings')
  async getSettings(@CurrentUser() user: UserPayload) {
    return this.security.getSettings(user.organizationId);
  }

  @Put('settings')
  async updateSettings(
    @CurrentUser() user: UserPayload,
    @Body() data: Partial<{
      ipWhitelistEnabled: boolean;
      sessionTimeoutMinutes: number;
      mfaRequired: boolean;
      passwordPolicy: 'basic' | 'strong' | 'enterprise';
      requirePasswordChangeDays: number;
      maxFailedLogins: number;
      lockoutDurationMinutes: number;
      auditLogRetentionDays: number;
      enforceHttps: boolean;
    }>,
  ) {
    return this.security.updateSettings(user.organizationId, data);
  }

  // ============================================================
  // IP WHITELIST
  // ============================================================

  @Get('ip-whitelist')
  async getIpWhitelist(@CurrentUser() user: UserPayload) {
    return this.security.getIpWhitelist(user.organizationId);
  }

  @Post('ip-whitelist')
  async addIpToWhitelist(
    @CurrentUser() user: UserPayload,
    @Body() data: {
      ipPattern: string;
      description?: string;
      expiresAt?: string;
    },
  ) {
    return this.security.addIpToWhitelist(user.organizationId, {
      ...data,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
    });
  }

  @Delete('ip-whitelist/:id')
  async removeIpFromWhitelist(
    @CurrentUser() user: UserPayload,
    @Param('id') entryId: string,
  ) {
    await this.security.removeIpFromWhitelist(user.organizationId, entryId);
    return { success: true };
  }

  @Put('ip-whitelist/:id/toggle')
  async toggleIpWhitelistEntry(
    @CurrentUser() user: UserPayload,
    @Param('id') entryId: string,
    @Body() data: { isActive: boolean },
  ) {
    return this.security.toggleIpWhitelistEntry(user.organizationId, entryId, data.isActive);
  }

  // ============================================================
  // PASSWORD POLICY
  // ============================================================

  @Post('validate-password')
  async validatePassword(
    @CurrentUser() user: UserPayload,
    @Body() data: { password: string },
  ) {
    const settings = await this.security.getSettings(user.organizationId);
    return this.security.validatePassword(data.password, settings.passwordPolicy);
  }

  // ============================================================
  // SECURITY EVENTS
  // ============================================================

  @Get('events')
  async getSecurityEvents(
    @CurrentUser() user: UserPayload,
    @Query('severity') severity?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.security.getSecurityEvents(user.organizationId, {
      severity,
      status,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  // ============================================================
  // SOC 2 COMPLIANCE
  // ============================================================

  @Get('compliance/soc2')
  async getSOC2Report(
    @CurrentUser() user: UserPayload,
    @Query('period') period: 'monthly' | 'quarterly' = 'monthly',
  ) {
    return this.security.getSOC2Report(user.organizationId, period);
  }
}
