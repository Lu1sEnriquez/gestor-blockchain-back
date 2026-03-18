import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';

import { BatchType } from '@/src/modules/documents/domain/enums/batch-type.enum';
import { NetworkState } from '@/src/modules/documents/domain/enums/network-state.enum';
import { EventEntity } from '@/src/modules/events/infrastructure/entities/event.entity';
import { AuditableEntity } from '@/src/shared/db/base/auditable.entity';

import { DocumentFolioEntity } from './document-folio.entity';

@Entity({ name: 'emission_batches' })
export class EmissionBatchEntity extends AuditableEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  eventId!: string;

  @Column({ type: 'enum', enum: BatchType })
  batchType!: BatchType;

  @Column({ type: 'varchar', length: 128 })
  merkleRootHash!: string;

  @Column({ type: 'varchar', length: 128, nullable: true })
  polygonTxHash!: string | null;

  @Column({ type: 'enum', enum: NetworkState, default: NetworkState.QUEUED })
  networkState!: NetworkState;

  @ManyToOne(() => EventEntity, (event) => event.emissionBatches, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'eventId' })
  event!: Relation<EventEntity>;

  @OneToMany(() => DocumentFolioEntity, (document) => document.batch)
  documents?: Relation<DocumentFolioEntity[]>;
}
