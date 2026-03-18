import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import type { Relation } from 'typeorm';

import { SignatureVaultEntity } from '@/src/modules/users/infrastructure/entities/signature-vault.entity';
import { AuditableEntity } from '@/src/shared/db/base/auditable.entity';

import { EventEntity } from './event.entity';

@Entity({ name: 'signer_consensus' })
@Unique(['eventId', 'signatureVaultId'])
export class SignerConsensusEntity extends AuditableEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  eventId!: string;

  @Column({ type: 'uuid' })
  signatureVaultId!: string;

  @Column({ type: 'boolean', nullable: true })
  approved!: boolean | null;

  @Column({ type: 'timestamptz', nullable: true })
  signedAt!: Date | null;

  @ManyToOne(() => EventEntity, (event) => event.signerConsensus, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'eventId' })
  event!: Relation<EventEntity>;

  @ManyToOne(() => SignatureVaultEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'signatureVaultId' })
  signatureVault!: Relation<SignatureVaultEntity>;
}
