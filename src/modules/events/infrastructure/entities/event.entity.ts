import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';

import { EmissionBatchEntity } from '@/src/modules/documents/infrastructure/entities/emission-batch.entity';
import { EventStatus } from '@/src/modules/events/domain/enums/event-status.enum';
import { DocumentTemplateEntity } from '@/src/modules/templates/infrastructure/entities/document-template.entity';
import { UserEntity } from '@/src/modules/users/infrastructure/entities/user.entity';
import { AuditableEntity } from '@/src/shared/db/base/auditable.entity';

import { SignerConsensusEntity } from './signer-consensus.entity';

@Entity({ name: 'events' })
export class EventEntity extends AuditableEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 220 })
  eventName!: string;

  @Column({ type: 'uuid' })
  templateId!: string;

  @Column({ type: 'uuid' })
  creatorId!: string;

  @Column({ type: 'enum', enum: EventStatus, default: EventStatus.PENDING })
  consensusStatus!: EventStatus;

  @Column({ type: 'boolean', default: true })
  web3Enabled!: boolean;

  @Column({ type: 'jsonb', default: {} })
  globalContextInjected!: Record<string, unknown>;

  @ManyToOne(() => DocumentTemplateEntity, (template) => template.events, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'templateId' })
  template!: Relation<DocumentTemplateEntity>;

  @ManyToOne(() => UserEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'creatorId' })
  creator!: Relation<UserEntity>;

  @OneToMany(() => SignerConsensusEntity, (consensus) => consensus.event)
  signerConsensus?: Relation<SignerConsensusEntity[]>;

  @OneToMany(() => EmissionBatchEntity, (batch) => batch.event)
  emissionBatches?: Relation<EmissionBatchEntity[]>;
}
