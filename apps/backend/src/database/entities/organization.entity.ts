import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { Territory } from './territory.entity';
import { Alert } from './alert.entity';
import { User } from './user.entity';
import { OnboardingData } from './onboarding.entity';

@Entity('organizations')
export class Organization {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ nullable: true })
  description?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Territory, (territory) => territory.organization)
  territories: Territory[];

  @OneToMany(() => Alert, (alert) => alert.organization)
  alerts: Alert[];

  @OneToMany(() => User, (user) => user.organization)
  users: User[];

  @OneToOne(() => OnboardingData, (onboarding) => onboarding.organization)
  onboarding: OnboardingData;
}
