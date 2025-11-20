import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum AuditAction {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  EXPORT = 'export',
  LOGIN = 'login',
  LOGOUT = 'logout',
  PERMISSION_CHANGE = 'permission_change',
  BILLING_UPDATE = 'billing_update',
  MODEL_SWITCH = 'model_switch',
}

export enum AuditResourceType {
  USER = 'user',
  ORGANIZATION = 'organization',
  BILLING = 'billing',
  USAGE = 'usage',
  AI_MODEL = 'ai_model',
  SEARCH = 'search',
  EXPORT = 'export',
}

@Entity('audit_logs')
@Index(['organizationId'])
@Index(['userId'])
@Index(['action'])
@Index(['resourceType'])
@Index(['createdAt'])
@Index(['organizationId', 'createdAt'])
@Index(['userId', 'createdAt'])
export class AuditLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  organizationId: string;

  @Column('uuid', { nullable: true })
  userId: string;

  @Column('varchar', { length: 50 })
  action: AuditAction;

  @Column('varchar', { length: 50 })
  resourceType: AuditResourceType;

  @Column('uuid', { nullable: true })
  resourceId: string;

  @Column('text')
  description: string;

  @Column('text', { nullable: true })
  changes: string;

  @Column('varchar', { length: 50, nullable: true })
  status: string;

  @Column('text', { nullable: true })
  metadata: string;

  @Column('varchar', { length: 100, nullable: true })
  ipAddress: string;

  @Column('varchar', { length: 500, nullable: true })
  userAgent: string;

  @CreateDateColumn()
  createdAt: Date;
}
