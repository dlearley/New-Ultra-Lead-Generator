import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSION_KEY } from '../decorators/require-permission.decorator';

interface UserWithRole {
  id: string;
  organizationId?: string;
  role: string;
  permissions?: string[];
}

const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: [
    'billing:create',
    'billing:read',
    'billing:update',
    'billing:delete',
    'billing:search',
    'billing:export',
    'audit:create',
    'audit:read',
    'audit:update',
    'audit:delete',
    'audit:search',
    'audit:export',
    'ai-model:create',
    'ai-model:read',
    'ai-model:update',
    'ai-model:delete',
  ],
  billing_manager: [
    'billing:read',
    'billing:update',
    'billing:search',
    'billing:export',
    'audit:read',
  ],
  compliance_officer: [
    'audit:read',
    'audit:search',
    'audit:export',
    'billing:read',
  ],
  ai_model_manager: [
    'ai-model:create',
    'ai-model:read',
    'ai-model:update',
    'ai-model:delete',
    'audit:read',
  ],
  viewer: [
    'billing:read',
    'audit:read',
    'ai-model:read',
  ],
};

@Injectable()
export class RbacGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermission = this.reflector.get<string>(
      PERMISSION_KEY,
      context.getHandler(),
    );

    if (!requiredPermission) {
      return true; // No permission required
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as UserWithRole;

    if (!user) {
      throw new ForbiddenException('User information not found');
    }

    const userPermissions = this.getUserPermissions(user);

    if (!userPermissions.includes(requiredPermission)) {
      throw new ForbiddenException(
        `User does not have required permission: ${requiredPermission}`,
      );
    }

    return true;
  }

  private getUserPermissions(user: UserWithRole): string[] {
    if (user.permissions) {
      return user.permissions;
    }

    return ROLE_PERMISSIONS[user.role] || [];
  }
}
