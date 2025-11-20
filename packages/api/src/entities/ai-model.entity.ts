import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum ModelProvider {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  COHERE = 'cohere',
  LOCAL = 'local',
}

export enum ModelStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DEPRECATED = 'deprecated',
  BETA = 'beta',
}

@Entity('ai_models')
@Index(['organizationId'])
@Index(['provider'])
@Index(['status'])
@Index(['isActive'])
export class AiModelEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  organizationId: string;

  @Column('varchar', { length: 100 })
  name: string;

  @Column('varchar', { length: 50 })
  provider: ModelProvider;

  @Column('varchar', { length: 100 })
  version: string;

  @Column('varchar', { length: 50 })
  status: ModelStatus;

  @Column('boolean', { default: false })
  isActive: boolean;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  averageLatencyMs: number;

  @Column('decimal', { precision: 5, scale: 2, default: 0 })
  errorRate: number;

  @Column('integer', { default: 0 })
  totalRequests: number;

  @Column('integer', { default: 0 })
  failedRequests: number;

  @Column('text', { nullable: true })
  config: string;

  @Column('text', { nullable: true })
  metadata: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column('date', { nullable: true })
  deployedAt: Date;
}
