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
import { User } from './user.entity';
import { Organization } from './organization.entity';
import { Alert } from './alert.entity';

export enum TerritoryType {
  POLYGON = 'polygon',
  RADIUS = 'radius',
  STATE = 'state',
  COUNTY = 'county',
}

export interface PolygonCoordinates {
  latitude: number;
  longitude: number;
}

export interface RadiusGeometry {
  latitude: number;
  longitude: number;
  radiusInMiles: number;
}

@Entity('territories')
export class Territory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  organizationId: string;

  @Column()
  name: string;

  @Column('enum', { enum: TerritoryType })
  type: TerritoryType;

  @Column('jsonb', { nullable: true })
  polygonCoordinates?: PolygonCoordinates[];

  @Column('jsonb', { nullable: true })
  radiusGeometry?: RadiusGeometry;

  @Column({ nullable: true })
  stateCode?: string;

  @Column({ nullable: true })
  countyCode?: string;

  @Column({ nullable: true })
  ownerId?: string;

  @Column('jsonb', { nullable: true })
  ownerIds?: string[];

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Organization, (org) => org.territories, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @ManyToOne(() => User, (user) => user.territories, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'ownerId' })
  owner?: User;

  @OneToMany(() => Alert, (alert) => alert.territory)
  alerts: Alert[];
}
