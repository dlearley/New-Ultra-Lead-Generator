import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum BillingStatus {
  TRIAL = 'trial',
  PAID = 'paid',
  DELINQUENT = 'delinquent',
}

export enum BillingPlan {
  STARTER = 'starter',
  PROFESSIONAL = 'professional',
  ENTERPRISE = 'enterprise',
}

@Entity('billing')
@Index(['organizationId'])
@Index(['status'])
@Index(['createdAt'])
export class BillingEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  organizationId: string;

  @Column('varchar', { length: 50 })
  status: BillingStatus;

  @Column('varchar', { length: 50 })
  plan: BillingPlan;

  @Column('varchar', { length: 100, nullable: true })
  stripeCustomerId: string;

  @Column('varchar', { length: 100, nullable: true })
  stripeSubscriptionId: string;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  monthlySpend: number;

  @Column('integer', { default: 0 })
  apiCallsUsed: number;

  @Column('integer', { default: 100000 })
  apiCallsLimit: number;

  @Column('integer', { default: 0 })
  usersCount: number;

  @Column('integer', { default: 0 })
  projectsCount: number;

  @Column('text', { nullable: true })
  metadata: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column('date', { nullable: true })
  trialEndsAt: Date;

  @Column('date', { nullable: true })
  billingCycleStartDate: Date;

  @Column('date', { nullable: true })
  billingCycleEndDate: Date;
}
