import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../services/prisma.service';

export interface Conflict {
  id: string;
  entityType: string;
  entityId: string;
  localData: any;
  crmData: any;
  conflictFields: string[];
  detectedAt: Date;
}

export interface ResolutionStrategy {
  type: 'crm_wins' | 'local_wins' | 'newer_wins' | 'merge' | 'manual';
  fieldRules?: Record<string, 'crm' | 'local' | 'newer' | 'merge'>;
}

export interface ConflictResolution {
  conflictId: string;
  resolvedFields: Array<{
    field: string;
    localValue: any;
    crmValue: any;
    resolvedValue: any;
    strategy: string;
  }>;
  appliedAt: Date;
}

@Injectable()
export class ConflictResolutionService {
  private readonly logger = new Logger(ConflictResolutionService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ============================================================
  // CONFLICT DETECTION
  // ============================================================

  async detectConflicts(
    entityType: string,
    localEntity: any,
    crmEntity: any,
    fieldMappings: any[],
  ): Promise<Conflict | null> {
    const conflictFields: string[] = [];
    const localData: any = {};
    const crmData: any = {};

    for (const mapping of fieldMappings) {
      const localValue = localEntity[mapping.localField];
      const crmValue = crmEntity[mapping.crmField];

      // Check if values differ
      if (!this.valuesEqual(localValue, crmValue)) {
        conflictFields.push(mapping.localField);
        localData[mapping.localField] = localValue;
        crmData[mapping.localField] = crmValue;
      }
    }

    if (conflictFields.length === 0) {
      return null;
    }

    return {
      id: `${entityType}_${localEntity.id}_${Date.now()}`,
      entityType,
      entityId: localEntity.id,
      localData,
      crmData,
      conflictFields,
      detectedAt: new Date(),
    };
  }

  // ============================================================
  // AUTOMATIC CONFLICT RESOLUTION
  // ============================================================

  async resolveConflictAutomatically(
    conflict: Conflict,
    strategy: ResolutionStrategy,
    localUpdatedAt?: Date,
    crmUpdatedAt?: Date,
  ): Promise<ConflictResolution> {
    const resolvedFields: ConflictResolution['resolvedFields'] = [];

    for (const field of conflict.conflictFields) {
      const localValue = conflict.localData[field];
      const crmValue = conflict.crmData[field];
      
      // Get field-specific rule or default strategy
      const fieldStrategy = strategy.fieldRules?.[field] || strategy.type;
      
      let resolvedValue: any;
      let appliedStrategy: string;

      switch (fieldStrategy) {
        case 'crm_wins':
          resolvedValue = crmValue;
          appliedStrategy = 'crm_wins';
          break;

        case 'local_wins':
          resolvedValue = localValue;
          appliedStrategy = 'local_wins';
          break;

        case 'newer_wins':
          const localNewer = !localUpdatedAt || !crmUpdatedAt || localUpdatedAt > crmUpdatedAt;
          resolvedValue = localNewer ? localValue : crmValue;
          appliedStrategy = localNewer ? 'local_newer' : 'crm_newer';
          break;

        case 'merge':
          resolvedValue = this.mergeValues(localValue, crmValue, field);
          appliedStrategy = 'merged';
          break;

        default:
          // Default to CRM wins if strategy unclear
          resolvedValue = crmValue;
          appliedStrategy = 'crm_wins_default';
      }

      resolvedFields.push({
        field,
        localValue,
        crmValue,
        resolvedValue,
        strategy: appliedStrategy,
      });
    }

    const resolution: ConflictResolution = {
      conflictId: conflict.id,
      resolvedFields,
      appliedAt: new Date(),
    };

    // Log the resolution
    await this.logResolution(conflict, resolution);

    return resolution;
  }

  // ============================================================
  // SMART MERGE STRATEGIES
  // ============================================================

  private mergeValues(localValue: any, crmValue: any, field: string): any {
    // String fields: take longer/more complete value
    if (typeof localValue === 'string' && typeof crmValue === 'string') {
      // For arrays (like tags), combine unique values
      if (field.includes('tag') || field.includes('list')) {
        const localArray = localValue.split(',').map((s: string) => s.trim());
        const crmArray = crmValue.split(',').map((s: string) => s.trim());
        return [...new Set([...localArray, ...crmArray])].join(', ');
      }
      
      // For names/emails, prefer local if it looks more complete
      if (field.includes('name') || field.includes('email')) {
        return localValue.length >= crmValue.length ? localValue : crmValue;
      }
      
      // Default: take longer string (more info)
      return localValue.length >= crmValue.length ? localValue : crmValue;
    }

    // Numbers: take larger (for things like employee count, revenue)
    if (typeof localValue === 'number' && typeof crmValue === 'number') {
      if (field.includes('count') || field.includes('revenue') || field.includes('size')) {
        return Math.max(localValue, crmValue);
      }
      // Default: take local
      return localValue;
    }

    // Arrays: combine unique
    if (Array.isArray(localValue) && Array.isArray(crmValue)) {
      return [...new Set([...localValue, ...crmValue])];
    }

    // Dates: take newer
    if (localValue instanceof Date && crmValue instanceof Date) {
      return localValue > crmValue ? localValue : crmValue;
    }

    // Default: prefer local
    return localValue !== undefined && localValue !== null ? localValue : crmValue;
  }

  // ============================================================
  // CONFLICT RESOLUTION RULES
  // ============================================================

  async getResolutionRules(connectionId: string): Promise<ResolutionStrategy> {
    const connection = await this.prisma.crmConnection.findFirst({
      where: { id: connectionId },
    });

    if (!connection) {
      return { type: 'crm_wins' };
    }

    const settings = (connection.settings as any) || {};
    
    return {
      type: settings.conflictResolution || 'crm_wins',
      fieldRules: settings.fieldResolutionRules || {},
    };
  }

  async setResolutionRules(
    connectionId: string,
    strategy: ResolutionStrategy,
  ): Promise<void> {
    await this.prisma.crmConnection.update({
      where: { id: connectionId },
      data: {
        settings: {
          conflictResolution: strategy.type,
          fieldResolutionRules: strategy.fieldRules,
        },
      },
    });
  }

  // ============================================================
  // CONFLICT HISTORY & REPORTING
  // ============================================================

  async getConflictHistory(
    organizationId: string,
    options?: {
      entityType?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    },
  ): Promise<any[]> {
    // This would query a conflict log table
    // For now, return placeholder
    return [];
  }

  async getConflictStats(organizationId: string): Promise<{
    totalConflicts: number;
    autoResolved: number;
    manualResolved: number;
    pending: number;
    byEntityType: Record<string, number>;
  }> {
    // Return stats from conflict log
    return {
      totalConflicts: 0,
      autoResolved: 0,
      manualResolved: 0,
      pending: 0,
      byEntityType: {},
    };
  }

  // ============================================================
  // BATCH CONFLICT RESOLUTION
  // ============================================================

  async resolveBatchConflicts(
    conflicts: Conflict[],
    strategy: ResolutionStrategy,
  ): Promise<{
    resolved: number;
    failed: number;
    resolutions: ConflictResolution[];
  }> {
    const resolutions: ConflictResolution[] = [];
    let resolved = 0;
    let failed = 0;

    for (const conflict of conflicts) {
      try {
        const resolution = await this.resolveConflictAutomatically(
          conflict,
          strategy,
        );
        resolutions.push(resolution);
        resolved++;
      } catch (error) {
        this.logger.error(`Failed to resolve conflict ${conflict.id}:`, error);
        failed++;
      }
    }

    return { resolved, failed, resolutions };
  }

  // ============================================================
  // CONFLICT PREVIEW
  // ============================================================

  async previewResolution(
    conflict: Conflict,
    strategy: ResolutionStrategy,
  ): Promise<ConflictResolution> {
    // Non-destructive preview of what resolution would look like
    const resolvedFields: ConflictResolution['resolvedFields'] = [];

    for (const field of conflict.conflictFields) {
      const localValue = conflict.localData[field];
      const crmValue = conflict.crmData[field];
      
      const fieldStrategy = strategy.fieldRules?.[field] || strategy.type;
      
      let resolvedValue: any;
      let appliedStrategy: string;

      switch (fieldStrategy) {
        case 'crm_wins':
          resolvedValue = crmValue;
          appliedStrategy = 'crm_wins';
          break;
        case 'local_wins':
          resolvedValue = localValue;
          appliedStrategy = 'local_wins';
          break;
        case 'merge':
          resolvedValue = this.mergeValues(localValue, crmValue, field);
          appliedStrategy = 'merged';
          break;
        default:
          resolvedValue = crmValue;
          appliedStrategy = 'crm_wins';
      }

      resolvedFields.push({
        field,
        localValue,
        crmValue,
        resolvedValue,
        strategy: appliedStrategy,
      });
    }

    return {
      conflictId: conflict.id,
      resolvedFields,
      appliedAt: new Date(),
    };
  }

  // ============================================================
  // HELPERS
  // ============================================================

  private valuesEqual(a: any, b: any): boolean {
    // Handle null/undefined
    if (a == null && b == null) return true;
    if (a == null || b == null) return false;

    // Handle dates
    if (a instanceof Date && b instanceof Date) {
      return a.getTime() === b.getTime();
    }

    // Handle arrays
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      return a.every((val, idx) => this.valuesEqual(val, b[idx]));
    }

    // Handle objects
    if (typeof a === 'object' && typeof b === 'object') {
      const keysA = Object.keys(a);
      const keysB = Object.keys(b);
      if (keysA.length !== keysB.length) return false;
      return keysA.every((key) => this.valuesEqual(a[key], b[key]));
    }

    // Default strict equality
    return a === b;
  }

  private async logResolution(
    conflict: Conflict,
    resolution: ConflictResolution,
  ): Promise<void> {
    this.logger.log(`Conflict ${conflict.id} resolved:`, {
      entityType: conflict.entityType,
      entityId: conflict.entityId,
      fieldsResolved: resolution.resolvedFields.length,
      strategies: resolution.resolvedFields.map((f) => f.strategy),
    });

    // Could also save to database for audit trail
  }
}
