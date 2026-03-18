import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

import { AuditableEntity } from '@/src/shared/db/base/auditable.entity';

@Entity({ name: 'revocation_jobs' })
@Index(['status', 'nextRetryAt'])
export class RevocationJobEntity extends AuditableEntity {
  @PrimaryColumn({ type: 'varchar', length: 200 })
  id!: string;

  @Column({ type: 'varchar', length: 200, unique: true })
  idempotencyKey!: string;

  @Column({ type: 'uuid' })
  eventId!: string;

  @Column({ type: 'varchar', length: 128 })
  hashToRevoke!: string;

  @Column({ type: 'varchar', length: 20 })
  status!: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

  @Column({ type: 'integer', default: 0 })
  attemptCount!: number;

  @Column({ type: 'integer', default: 5 })
  maxAttempts!: number;

  @Column({ type: 'timestamptz' })
  nextRetryAt!: Date;

  @Column({ type: 'varchar', length: 130, nullable: true })
  txHash?: string;

  @Column({ type: 'text', nullable: true })
  lastError?: string;
}
