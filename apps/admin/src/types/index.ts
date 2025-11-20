export type OrgStatus = "active" | "suspended" | "inactive";
export type UserRole = "admin" | "member" | "viewer";
export type Plan = "free" | "pro" | "enterprise";

export interface Organization {
  id: string;
  name: string;
  status: OrgStatus;
  plan: Plan;
  usage: {
    users: number;
    requests: number;
    storage: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  organizationId: string;
  email: string;
  name: string;
  role: UserRole;
  lastActivity?: Date;
  connectorsEnabled: string[];
  mfaEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditLog {
  id: string;
  action: string;
  actor: string;
  target: string;
  details: Record<string, any>;
  timestamp: Date;
}

export interface AdminContext {
  userId: string;
  isAdmin: boolean;
}
