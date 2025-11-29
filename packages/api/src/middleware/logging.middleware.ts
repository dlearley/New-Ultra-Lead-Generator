import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AuditLogService } from '../services/audit-log.service';
import { AuditAction, AuditResourceType } from '../entities/audit-log.entity';

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  constructor(private auditLogService: AuditLogService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const start = Date.now();
    const path = req.path;
    const method = req.method;

    res.on('finish', async () => {
      const duration = Date.now() - start;
      const statusCode = res.statusCode;

      // Structured logging
      const logData = {
        timestamp: new Date().toISOString(),
        method,
        path,
        statusCode,
        duration: `${duration}ms`,
        userId: (req as any).user?.id,
        organizationId: (req as any).user?.organizationId || req.query.organizationId,
        userAgent: req.get('user-agent'),
        ipAddress: this.getClientIp(req),
      };

      console.log('API Request:', JSON.stringify(logData, null, 2));

      // Log to audit system for admin operations
      if (this.isAdminOperation(path, method)) {
        try {
          const action = this.getActionFromMethod(method);
          const resourceType = this.getResourceTypeFromPath(path);

          if (action && resourceType && (req as any).user?.organizationId) {
            await this.auditLogService.createLog({
              organizationId: (req as any).user.organizationId,
              userId: (req as any).user?.id,
              action,
              resourceType,
              description: `${method} ${path}`,
              status: statusCode >= 200 && statusCode < 300 ? 'success' : 'failure',
              ipAddress: this.getClientIp(req),
              userAgent: req.get('user-agent'),
            });
          }
        } catch (error) {
          console.error('Failed to log audit event:', error);
        }
      }
    });

    next();
  }

  private isAdminOperation(path: string, method: string): boolean {
    return path.includes('/admin/');
  }

  private getActionFromMethod(method: string): AuditAction | undefined {
    const actionMap: Record<string, AuditAction> = {
      GET: AuditAction.READ,
      POST: AuditAction.CREATE,
      PUT: AuditAction.UPDATE,
      PATCH: AuditAction.UPDATE,
      DELETE: AuditAction.DELETE,
    };
    return actionMap[method];
  }

  private getResourceTypeFromPath(path: string): AuditResourceType | undefined {
    if (path.includes('/billing')) return AuditResourceType.BILLING;
    if (path.includes('/audit-logs')) return AuditResourceType.USER;
    if (path.includes('/ai-models')) return AuditResourceType.AI_MODEL;
    if (path.includes('/usage')) return AuditResourceType.USAGE;
    return undefined;
  }

  private getClientIp(req: Request): string {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      req.connection.remoteAddress ||
      'unknown'
    );
  }
}
