import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../services/prisma.service';

export interface AuditLogEntry {
  action: string;
  entityType: string;
  entityId?: string;
  userId?: string;
  userEmail?: string;
  previousValues?: any;
  newValues?: any;
  changes?: any;
  ipAddress?: string;
  userAgent?: string;
  status: 'success' | 'failure' | 'denied';
  severity: 'info' | 'warning' | 'error' | 'critical';
  category: 'security' | 'data' | 'user' | 'system';
}

@Injectable()
export class AuditLoggingService {
  private readonly logger = new Logger(AuditLoggingService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ============================================================
  // LOG EVENT
  // ============================================================

  async log(event: AuditLogEntry & { organizationId: string }): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        organizationId: event.organizationId,
        action: event.action,
        entityType: event.entityType,
        entityId: event.entityId,
        userId: event.userId,
        userEmail: event.userEmail,
        previousValues: event.previousValues,
        newValues: event.newValues,
        changes: event.changes,
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
        status: event.status,
        severity: event.severity,
        category: event.category,
        timestamp: new Date(),
      },
    });

    // Also log to console for monitoring
    if (event.severity === 'critical' || event.severity === 'error') {
      this.logger.error(`[${event.severity.toUpperCase()}] ${event.action}: ${event.entityType}`, {
        userId: event.userId,
        entityId: event.entityId,
      });
    }
  }

  // ============================================================
  // DATA ACCESS LOGGING
  // ============================================================

  async logDataAccess(
    organizationId: string,
    data: {
      userId: string;
      userEmail: string;
      action: 'view' | 'export' | 'download' | 'share';
      entityType: string;
      entityId: string;
      recordCount?: number;
      ipAddress?: string;
      userAgent?: string;
    },
  ): Promise<void> {
    await this.log({
      organizationId,
      action: `data_${data.action}`,
      entityType: data.entityType,
      entityId: data.entityId,
      userId: data.userId,
      userEmail: data.userEmail,
      newValues: { recordCount: data.recordCount },
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      status: 'success',
      severity: 'info',
      category: 'data',
    });
  }

  // ============================================================
  // DATA MODIFICATION LOGGING
  // ============================================================

  async logDataChange(
    organizationId: string,
    data: {
      userId: string;
      userEmail: string;
      action: 'create' | 'update' | 'delete';
      entityType: string;
      entityId: string;
      previousValues?: any;
      newValues?: any;
      ipAddress?: string;
    },
  ): Promise<void> {
    // Calculate changes
    const changes = this.calculateChanges(data.previousValues, data.newValues);

    await this.log({
      organizationId,
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId,
      userId: data.userId,
      userEmail: data.userEmail,
      previousValues: data.previousValues,
      newValues: data.newValues,
      changes,
      ipAddress: data.ipAddress,
      status: 'success',
      severity: data.action === 'delete' ? 'warning' : 'info',
      category: 'data',
    });
  }

  // ============================================================
  // SECURITY EVENT LOGGING
  // ============================================================

  async logSecurityEvent(
    organizationId: string,
    data: {
      eventType: 'login' | 'logout' | 'login_failed' | 'permission_denied' | 
                 'suspicious_activity' | 'password_change' | 'mfa_triggered' |
                 'data_export' | 'bulk_delete';
      userId?: string;
      userEmail?: string;
      description: string;
      severity: 'info' | 'warning' | 'error' | 'critical';
      ipAddress?: string;
      metadata?: any;
      status?: 'success' | 'failure';
    },
  ): Promise<void> {
    await this.log({
      organizationId,
      action: data.eventType,
      entityType: 'security',
      userId: data.userId,
      userEmail: data.userEmail,
      newValues: { description: data.description, ...data.metadata },
      ipAddress: data.ipAddress,
      status: data.status || 'success',
      severity: data.severity,
      category: 'security',
    });

    // Also create security event for critical issues
    if (data.severity === 'critical' || data.severity === 'error') {
      await this.prisma.securityEvent.create({
        data: {
          organizationId,
          eventType: data.eventType,
          severity: data.severity,
          description: data.description,
          userId: data.userId,
          userEmail: data.userEmail,
          ipAddress: data.ipAddress,
          metadata: data.metadata,
          status: 'open',
        },
      });
    }
  }

  // ============================================================
  // USER ACTIVITY LOGGING
  // ============================================================

  async logUserActivity(
    organizationId: string,
    data: {
      userId: string;
      userEmail: string;
      activity: 'login' | 'logout' | 'password_reset' | 'profile_update' | 
                'settings_change' | 'api_key_generated';
      ipAddress?: string;
      userAgent?: string;
      metadata?: any;
    },
  ): Promise<void> {
    await this.log({
      organizationId,
      action: data.activity,
      entityType: 'user',
      entityId: data.userId,
      userId: data.userId,
      userEmail: data.userEmail,
      newValues: data.metadata,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      status: 'success',
      severity: 'info',
      category: 'user',
    });
  }

  // ============================================================
  // QUERY AUDIT LOGS
  // ============================================================

  async getAuditLogs(
    organizationId: string,
    filters?: {
      userId?: string;
      entityType?: string;
      action?: string;
      severity?: string;
      category?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    },
  ): Promise<{
    logs: any[];
    total: number;
  }> {
    const where: any = { organizationId };

    if (filters?.userId) where.userId = filters.userId;
    if (filters?.entityType) where.entityType = filters.entityType;
    if (filters?.action) where.action = filters.action;
    if (filters?.severity) where.severity = filters.severity;
    if (filters?.category) where.category = filters.category;
    
    if (filters?.startDate || filters?.endDate) {
      where.timestamp = {};
      if (filters.startDate) where.timestamp.gte = filters.startDate;
      if (filters.endDate) where.timestamp.lte = filters.endDate;
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: filters?.limit || 50,
        skip: filters?.offset || 0,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { logs, total };
  }

  async getEntityHistory(
    organizationId: string,
    entityType: string,
    entityId: string,
  ): Promise<any[]> {
    return this.prisma.auditLog.findMany({
      where: {
        organizationId,
        entityType,
        entityId,
      },
      orderBy: { timestamp: 'desc' },
    });
  }

  async getUserActivity(
    organizationId: string,
    userId: string,
    days: number = 30,
  ): Promise<{
    activity: any[];
    summary: {
      totalActions: number;
      topActions: Array<{ action: string; count: number }>;
      lastLogin?: Date;
    };
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const activity = await this.prisma.auditLog.findMany({
      where: {
        organizationId,
        userId,
        timestamp: { gte: startDate },
      },
      orderBy: { timestamp: 'desc' },
    });

    // Calculate summary
    const actionCounts: Record<string, number> = {};
    activity.forEach((log) => {
      actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
    });

    const topActions = Object.entries(actionCounts)
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const lastLogin = activity.find((a) => a.action === 'login')?.timestamp;

    return {
      activity,
      summary: {
        totalActions: activity.length,
        topActions,
        lastLogin,
      },
    };
  }

  // ============================================================
  // AUDIT ANALYTICS
  // ============================================================

  async getSecurityMetrics(
    organizationId: string,
    days: number = 30,
  ): Promise<{
    totalEvents: number;
    failedLogins: number;
    permissionDenials: number;
    dataExports: number;
    suspiciousActivities: number;
    topUsers: Array<{ userId: string; email: string; actionCount: number }>;
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const logs = await this.prisma.auditLog.findMany({
      where: {
        organizationId,
        timestamp: { gte: startDate },
      },
    });

    const failedLogins = logs.filter((l) => l.action === 'login_failed').length;
    const permissionDenials = logs.filter((l) => l.action === 'permission_denied').length;
    const dataExports = logs.filter((l) => l.action === 'data_export').length;
    const suspiciousActivities = logs.filter((l) => l.action === 'suspicious_activity').length;

    // Top users
    const userCounts: Record<string, { userId: string; email: string; count: number }> = {};
    logs.forEach((log) => {
      if (log.userId) {
        if (!userCounts[log.userId]) {
          userCounts[log.userId] = {
            userId: log.userId,
            email: log.userEmail || '',
            count: 0,
          };
        }
        userCounts[log.userId].count++;
      }
    });

    const topUsers = Object.values(userCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map(u => ({ userId: u.userId, email: u.email, actionCount: u.count }));

    return {
      totalEvents: logs.length,
      failedLogins,
      permissionDenials,
      dataExports,
      suspiciousActivities,
      topUsers,
    };
  }

  // ============================================================
  // EXPORT AUDIT LOGS
  // ============================================================

  async exportAuditLogs(
    organizationId: string,
    filters?: {
      startDate?: Date;
      endDate?: Date;
      format?: 'csv' | 'json';
    },
  ): Promise<{ url: string; filename: string }> {
    const where: any = { organizationId };

    if (filters?.startDate || filters?.endDate) {
      where.timestamp = {};
      if (filters.startDate) where.timestamp.gte = filters.startDate;
      if (filters.endDate) where.timestamp.lte = filters.endDate;
    }

    const logs = await this.prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
    });

    // In production, generate actual file and upload to S3
    const timestamp = new Date().toISOString().split('T')[0];
    const format = filters?.format || 'csv';
    const filename = `audit_logs_${organizationId}_${timestamp}.${format}`;

    return {
      url: `https://exports.example.com/${filename}`,
      filename,
    };
  }

  // ============================================================
  // HELPERS
  // ============================================================

  private calculateChanges(previous: any, current: any): any {
    if (!previous || !current) return null;

    const changes: Record<string, { from: any; to: any }> = {};

    for (const key of Object.keys(current)) {
      if (previous[key] !== current[key]) {
        changes[key] = {
          from: previous[key],
          to: current[key],
        };
      }
    }

    return Object.keys(changes).length > 0 ? changes : null;
  }
}
