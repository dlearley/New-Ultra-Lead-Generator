import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Organization } from './organization.entity';

export interface OrgICP {
  industries: string[];
  geographies: string[];
  dealSizes: string[];
  personas: string[];
  aiScoring?: {
    score: number;
    updatedAt: Date;
    factors: Record<string, number>;
  };
}

@Entity('onboarding_data')
export class OnboardingData {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  organizationId: string;

  @Column('jsonb')
  orgICP: OrgICP;

  @Column({ default: false })
  isCompleted: boolean;

  @Column({ nullable: true })
  completedAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToOne(() => Organization, (org) => org.onboarding, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;
}
