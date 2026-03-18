import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import type { Relation } from 'typeorm';

import { EventEntity } from '@/src/modules/events/infrastructure/entities/event.entity';
import { UserEntity } from '@/src/modules/users/infrastructure/entities/user.entity';
import { AuditableEntity } from '@/src/shared/db/base/auditable.entity';

@Entity({ name: 'document_templates' })
@Unique(['folioPrefix'])
export class DocumentTemplateEntity extends AuditableEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 180 })
  templateName!: string;

  @Column({ type: 'varchar', length: 20 })
  folioPrefix!: string;

  @Column({ type: 'jsonb' })
  craftSchemaJson!: Record<string, unknown>;

  @Column({ type: 'uuid' })
  creatorId!: string;

  @OneToMany(() => EventEntity, (event) => event.template)
  events?: Relation<EventEntity[]>;

  @ManyToOne(() => UserEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'creatorId' })
  creator!: Relation<UserEntity>;
}
