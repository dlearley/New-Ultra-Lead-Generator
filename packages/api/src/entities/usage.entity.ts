import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum UsageMetricType {
  API_CALLS = 'api_calls',
  SEARCH_QUERIES = 'search_queries',
  DATA_EXPORT = 'data_export',
  STORAGE_GB = 'storage_gb',
  SEATS = 'seats',
}

@Entity('usage_metrics')
@Index(['organizationId'])
@Index(['metricType'])
@Index(['createdAt'])
@Index(['organizationId', 'createdAt'])
export class UsageMetricEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  organizationId: string;

  @Column('varchar', { length: 50 })
  metricType: UsageMetricType;

  @Column('integer')
  value: number;

  @Column('integer', { nullable: true })
  limit: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  cost: number;

  @Column('text', { nullable: true })
  metadata: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column('date')
  dateRecorded: Date;
}
