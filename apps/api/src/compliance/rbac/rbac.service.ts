import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../services/prisma.service';

export interface PermissionSet {
  contacts?: { read: boolean; write: boolean; delete: boolean; export: boolean };
  companies?: { read: boolean; write: boolean; delete: boolean };
  deals?: { read: boolean; write: boolean; delete: boolean };
  sequences?: { read: boolean; write: boolean; delete: boolean; execute: boolean };
  analytics?: { read: boolean; export: boolean };
  settings?: { read: boolean; write: boolean };
  users?: { read: boolean; write: boolean; delete: boolean };
  integrations?: { read: boolean; write: boolean };
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: PermissionSet;
  allowedFields?: string[];
  restrictedFields?: string[];
  dataScope: 'all' | 'team' | 'own';
  allowedFeatures: string[];
  canExportData: boolean;
  canDeleteData: boolean;
  canModifySettings: boolean;
}

@Injectable()
export class RBACService {
  private readonly logger = new Logger(RBACService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ============================================================
  // DEFAULT ROLES
  // ============================================================

  async createDefaultRoles(organizationId: string): Promise<void> {
    const defaultRoles = [
      {
        name: 'admin',
        description: 'Full access to all features and data',
        permissions: {
          contacts: { read: true, write: true, delete: true, export: true },
          companies: { read: true, write: true, delete: true },
          deals: { read: true, write: true, delete: true },
          sequences: { read: true, write: true, delete: true, execute: true },
          analytics: { read: true, export: true },
          settings: { read: true, write: true },
          users: { read: true, write: true, delete: true },
          integrations: { read: true, write: true },
        },
        dataScope: 'all',
        allowedFeatures: ['*'],
        canExportData: true,
        canDeleteData: true,
        canModifySettings: true,
        isDefault: true,
      },
      {
        name: 'manager',
        description: 'Can manage team and view all data',
        permissions: {
          contacts: { read: true, write: true, delete: false, export: true },
          companies: { read: true, write: true, delete: false },
          deals: { read: true, write: true, delete: false },
          sequences: { read: true, write: true, delete: false, execute: true },
          analytics: { read: true, export: true },
          settings: { read: true, write: false },
          users: { read: true, write: true, delete: false },
          integrations: { read: true, write: false },
        },
        dataScope: 'all',
        allowedFeatures: [
          'contacts', 'companies', 'deals', 'sequences', 'analytics',
          'dashboard', 'reports', 'buying_groups', 'ai_chat',
        ],
        canExportData: true,
        canDeleteData: false,
        canModifySettings: false,
      },
      {
        name: 'sales_rep',
        description: 'Sales-focused access to leads and outreach',
        permissions: {
          contacts: { read: true, write: true, delete: false, export: false },
          companies: { read: true, write: false, delete: false },
          deals: { read: true, write: true, delete: false },
          sequences: { read: true, write: false, delete: false, execute: true },
          analytics: { read: true, export: false },
          settings: { read: false, write: false },
          users: { read: false, write: false, delete: false },
          integrations: { read: false, write: false },
        },
        dataScope: 'own',
        allowedFeatures: [
          'contacts', 'companies', 'deals', 'sequences', 'dashboard',
          'buying_groups', 'ai_chat', 'caller',
        ],
        restrictedFields: ['leadScore', 'aiInsights', 'attributionData'],
        canExportData: false,
        canDeleteData: false,
        canModifySettings: false,
      },
      {
        name: 'marketing',
        description: 'Marketing campaign and analytics access',
        permissions: {
          contacts: { read: true, write: true, delete: false, export: true },
          companies: { read: true, write: false, delete: false },
          deals: { read: true, write: false, delete: false },
          sequences: { read: true, write: true, delete: false, execute: true },
          analytics: { read: true, export: true },
          settings: { read: true, write: false },
          users: { read: false, write: false, delete: false },
          integrations: { read: true, write: false },
        },
        dataScope: 'all',
        allowedFeatures: [
          'contacts', 'sequences', 'analytics', 'dashboard', 'reports',
          'campaigns', 'attribution', 'benchmarks',
        ],
        canExportData: true,
        canDeleteData: false,
        canModifySettings: false,
      },
      {
        name: 'viewer',
        description: 'Read-only access to data',
        permissions: {
          contacts: { read: true, write: false, delete: false, export: false },
          companies: { read: true, write: false, delete: false },
          deals: { read: true, write: false, delete: false },
          sequences: { read: true, write: false, delete: false, execute: false },
          analytics: { read: true, export: false },
          settings: { read: false, write: false },
          users: { read: false, write: false, delete: false },
          integrations: { read: false, write: false },
        },
        dataScope: 'all',
        allowedFeatures: ['contacts', 'companies', 'deals', 'analytics', 'dashboard'],
        canExportData: false,
        canDeleteData: false,
        canModifySettings: false,
      },
    ];

    for (const role of defaultRoles) {
      const existing = await this.prisma.rolePermission.findFirst({
        where: { organizationId, roleName: role.name },
      });

      if (!existing) {
        await this.prisma.rolePermission.create({
          data: {
            organizationId,
            ...role,
            permissions: role.permissions as any,
          },
        });
      }
    }
  }

  // ============================================================
  // ROLE MANAGEMENT
  // ============================================================

  async getRoles(organizationId: string): Promise<any[]> {
    return this.prisma.rolePermission.findMany({
      where: { organizationId },
      orderBy: { roleName: 'asc' },
    });
  }

  async getRole(organizationId: string, roleId: string): Promise<any> {
    return this.prisma.rolePermission.findFirst({
      where: { id: roleId, organizationId },
    });
  }

  async createRole(
    organizationId: string,
    data: {
      name: string;
      description?: string;
      permissions: PermissionSet;
      dataScope?: 'all' | 'team' | 'own';
      allowedFeatures?: string[];
      restrictedFields?: string[];
    },
  ): Promise<any> {
    return this.prisma.rolePermission.create({
      data: {
        organizationId,
        roleName: data.name,
        description: data.description,
        permissions: data.permissions as any,
        dataScope: data.dataScope || 'own',
        allowedFeatures: data.allowedFeatures || [],
        restrictedFields: data.restrictedFields || [],
        canExportData: data.permissions.contacts?.export || false,
        canDeleteData: data.permissions.contacts?.delete || false,
        canModifySettings: data.permissions.settings?.write || false,
      },
    });
  }

  async updateRole(
    organizationId: string,
    roleId: string,
    data: Partial<{
      description: string;
      permissions: PermissionSet;
      dataScope: 'all' | 'team' | 'own';
      allowedFeatures: string[];
      restrictedFields: string[];
    }>,
  ): Promise<any> {
    return this.prisma.rolePermission.update({
      where: { id: roleId, organizationId },
      data: {
        description: data.description,
        permissions: data.permissions as any,
        dataScope: data.dataScope,
        allowedFeatures: data.allowedFeatures,
        restrictedFields: data.restrictedFields,
      },
    });
  }

  // ============================================================
  // USER ROLE ASSIGNMENT
  // ============================================================

  async assignRole(
    organizationId: string,
    userId: string,
    roleId: string,
    assignedById: string,
  ): Promise<any> {
    // Remove existing assignment
    await this.prisma.userRoleAssignment.deleteMany({
      where: { organizationId, userId },
    });

    // Create new assignment
    return this.prisma.userRoleAssignment.create({
      data: {
        organizationId,
        userId,
        roleId,
        assignedById,
      },
    });
  }

  async getUserRole(
    organizationId: string,
    userId: string,
  ): Promise<{ role: any; permissions: PermissionSet } | null> {
    const assignment = await this.prisma.userRoleAssignment.findFirst({
      where: { organizationId, userId },
      include: { role: true },
    });

    if (!assignment) return null;

    return {
      role: assignment.role,
      permissions: assignment.role.permissions as PermissionSet,
    };
  }

  // ============================================================
  // PERMISSION CHECKS
  // ============================================================

  async checkPermission(
    organizationId: string,
    userId: string,
    resource: string,
    action: string,
  ): Promise<{ allowed: boolean; reason?: string }> {
    const userRole = await this.getUserRole(organizationId, userId);

    if (!userRole) {
      return { allowed: false, reason: 'No role assigned' };
    }

    const permissions = userRole.permissions;
    const resourcePerms = permissions[resource as keyof PermissionSet] as any;

    if (!resourcePerms) {
      return { allowed: false, reason: 'Resource not accessible' };
    }

    const allowed = resourcePerms[action] === true;

    return {
      allowed,
      reason: allowed ? undefined : `No ${action} permission for ${resource}`,
    };
  }

  async canAccessFeature(
    organizationId: string,
    userId: string,
    feature: string,
  ): Promise<boolean> {
    const userRole = await this.getUserRole(organizationId, userId);

    if (!userRole) return false;

    const allowedFeatures = userRole.role.allowedFeatures as string[];

    // Admin has access to everything
    if (allowedFeatures.includes('*')) return true;

    return allowedFeatures.includes(feature);
  }

  async canAccessData(
    organizationId: string,
    userId: string,
    dataOwnerId?: string,
  ): Promise<{ allowed: boolean; scope: 'all' | 'team' | 'own' }> {
    const userRole = await this.getUserRole(organizationId, userId);

    if (!userRole) {
      return { allowed: false, scope: 'own' };
    }

    const scope = userRole.role.dataScope as 'all' | 'team' | 'own';

    if (scope === 'all') {
      return { allowed: true, scope };
    }

    if (scope === 'own') {
      return { allowed: dataOwnerId === userId, scope };
    }

    // Team scope - would need team membership check
    return { allowed: true, scope };
  }

  // ============================================================
  // FIELD-LEVEL ACCESS
  // ============================================================

  async filterFieldsByAccess(
    organizationId: string,
    userId: string,
    data: any,
  ): Promise<any> {
    const userRole = await this.getUserRole(organizationId, userId);

    if (!userRole) return {};

    const restrictedFields = userRole.role.restrictedFields as string[];

    if (!restrictedFields || restrictedFields.length === 0) {
      return data;
    }

    // Remove restricted fields
    const filtered = { ...data };
    for (const field of restrictedFields) {
      delete filtered[field];
    }

    return filtered;
  }

  // ============================================================
  // PERMISSION SUMMARY
  // ============================================================

  async getPermissionSummary(
    organizationId: string,
    userId: string,
  ): Promise<{
    role: string;
    dataScope: string;
    permissions: PermissionSet;
    allowedFeatures: string[];
    restrictedFields: string[];
    canExport: boolean;
    canDelete: boolean;
  }> {
    const userRole = await this.getUserRole(organizationId, userId);

    if (!userRole) {
      throw new Error('No role assigned');
    }

    return {
      role: userRole.role.roleName,
      dataScope: userRole.role.dataScope,
      permissions: userRole.permissions,
      allowedFeatures: userRole.role.allowedFeatures as string[],
      restrictedFields: userRole.role.restrictedFields as string[],
      canExport: userRole.role.canExportData,
      canDelete: userRole.role.canDeleteData,
    };
  }
}
