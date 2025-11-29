import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Alert } from './alert.entity';

export enum AlertRunStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  SUCCESS = 'success',
  FAILED = 'failed',
}

@Entity('alert_runs')
export class AlertRun {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  alertId: string;

  @Column('enum', { enum: AlertRunStatus, default: AlertRunStatus.PENDING })
  status: AlertRunStatus;

  @Column({ default: 0 })
  newLeadsCount: number;

  @Column({ nullable: true })
  queueJobId?: string;

  @Column({ nullable: true })
  errorMessage?: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ nullable: true })
  completedAt?: Date;

  @ManyToOne(() => Alert, (alert) => alert.runs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'alertId' })
  alert: Alert;
}
