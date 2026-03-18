import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import type { Relation } from 'typeorm';

import { DocumentTemplateEntity } from '@/src/modules/templates/infrastructure/entities/document-template.entity';
import { AuditableEntity } from '@/src/shared/db/base/auditable.entity';

@Entity({ name: 'template_sequences' })
@Unique(['templateId', 'emissionYear'])
export class TemplateSequenceEntity extends AuditableEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  templateId!: string;

  @Column({ type: 'int' })
  emissionYear!: number;

  @Column({ type: 'int', default: 0 })
  currentSequence!: number;

  @ManyToOne(() => DocumentTemplateEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'templateId' })
  template!: Relation<DocumentTemplateEntity>;
}
