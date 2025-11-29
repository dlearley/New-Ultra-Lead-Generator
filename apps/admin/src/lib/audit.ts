import { AuditLog } from "@/types";

interface RBACContext {
  userId: string;
  isAdmin: boolean;
}

const auditLogs: AuditLog[] = [];

export function createAuditLog(
  context: RBACContext,
  action: string,
  target: string,
  details?: Record<string, any>
): AuditLog {
  const log: AuditLog = {
    id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    action,
    actor: context.userId,
    target,
    details: details || {},
    timestamp: new Date(),
  };

  auditLogs.push(log);
  return log;
}

export function getAuditLogs(filter?: {
  action?: string;
  actor?: string;
  target?: string;
}): AuditLog[] {
  if (!filter) {
    return auditLogs;
  }

  return auditLogs.filter((log) => {
    if (filter.action && log.action !== filter.action) return false;
    if (filter.actor && log.actor !== filter.actor) return false;
    if (filter.target && log.target !== filter.target) return false;
    return true;
  });
}
