import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Territory } from './territory.entity';
import { Organization } from './organization.entity';
import { AlertRun } from './alert-run.entity';

export enum DeliveryChannel {
  EMAIL = 'email',
  IN_APP = 'in_app',
}

export enum AlertCadence {
  REAL_TIME = 'real_time',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
}

export interface SavedSearchConfig {
  id: string;
  name: string;
  criteria: Record<string, any>;
}

@Entity('alerts')
export class Alert {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  organizationId: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description?: string;

  @Column()
  territoryId: string;

  @Column('jsonb')
  savedSearch: SavedSearchConfig;

  @Column('enum', { enum: AlertCadence, default: AlertCadence.DAILY })
  cadence: AlertCadence;

  @Column('simple-array')
  deliveryChannels: DeliveryChannel[];

  @Column('simple-array', { nullable: true })
  recipients?: string[];

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  lastRunAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Organization, (org) => org.alerts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @ManyToOne(() => Territory, (territory) => territory.alerts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'territoryId' })
  territory: Territory;

  @OneToMany(() => AlertRun, (run) => run.alert)
  runs: AlertRun[];
}
