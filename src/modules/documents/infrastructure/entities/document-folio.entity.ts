import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import type { Relation } from 'typeorm';

import { AuditableEntity } from '@/src/shared/db/base/auditable.entity';

import { EmissionBatchEntity } from './emission-batch.entity';

@Entity({ name: 'document_folios' })
@Unique(['institutionalFolio'])
export class DocumentFolioEntity extends AuditableEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  batchId!: string;

  @Column({ type: 'varchar', length: 80 })
  institutionalFolio!: string;

  @Column({ type: 'varchar', length: 40 })
  enrollmentId!: string;

  @Column({ type: 'jsonb' })
  rawPayloadData!: Record<string, unknown>;

  @Column({ type: 'varchar', length: 128 })
  originalDataHash!: string;

  @Column({ type: 'varchar', length: 700 })
  pdfStorageUrl!: string;

  @Column({ type: 'boolean', default: true })
  isValid!: boolean;

  @ManyToOne(() => EmissionBatchEntity, (batch) => batch.documents, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'batchId' })
  batch!: Relation<EmissionBatchEntity>;
}
