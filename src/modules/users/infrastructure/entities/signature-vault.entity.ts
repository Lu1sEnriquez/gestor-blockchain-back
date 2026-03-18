import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import type { Relation } from 'typeorm';

import { AuditableEntity } from '@/src/shared/db/base/auditable.entity';

import { UserEntity } from './user.entity';

@Entity({ name: 'signature_vaults' })
@Unique(['userId'])
export class SignatureVaultEntity extends AuditableEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'varchar', length: 150 })
  officialPosition!: string;

  @Column({ type: 'varchar', length: 500 })
  signaturePngUrl!: string;

  @OneToOne(() => UserEntity, (user) => user.signatureVault, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'userId' })
  user!: Relation<UserEntity>;
}
