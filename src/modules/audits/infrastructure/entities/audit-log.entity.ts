import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';

import { AuditAction } from '@/src/modules/audits/domain/enums/audit-action.enum';
import { UserEntity } from '@/src/modules/users/infrastructure/entities/user.entity';
import { AuditableEntity } from '@/src/shared/db/base/auditable.entity';

@Entity({ name: 'audit_logs' })
export class AuditLogEntity extends AuditableEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'enum', enum: AuditAction })
  action!: AuditAction;

  @Column({ type: 'varchar', length: 90 })
  affectedEntity!: string;

  @Column({ type: 'varchar', length: 60 })
  affectedEntityId!: string;

  @Column({ type: 'jsonb' })
  detailSnapshot!: Record<string, unknown>;

  @Column({ type: 'varchar', length: 50, nullable: true })
  sourceIp!: string | null;

  @ManyToOne(() => UserEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'userId' })
  user!: Relation<UserEntity>;
}
