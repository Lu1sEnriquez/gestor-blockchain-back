import { DataSource, LessThanOrEqual } from 'typeorm';

import {
  RevocationJob,
  RevocationQueueRepository,
} from '@/src/modules/events/application/sagas/revocation.saga';
import { RevocationJobEntity } from '@/src/modules/events/infrastructure/entities/revocation-job.entity';

export class TypeOrmRevocationQueueRepository implements RevocationQueueRepository {
  constructor(private readonly dataSource: DataSource) {}

  async findByIdempotencyKey(idempotencyKey: string): Promise<RevocationJob | null> {
    const job = await this.dataSource.getRepository(RevocationJobEntity).findOne({
      where: { idempotencyKey },
    });

    return job ? this.toDomain(job) : null;
  }

  async create(job: RevocationJob): Promise<void> {
    const entity = this.dataSource.getRepository(RevocationJobEntity).create(job);
    await this.dataSource.getRepository(RevocationJobEntity).save(entity);
  }

  async findProcessable(now: Date): Promise<RevocationJob | null> {
    const job = await this.dataSource.getRepository(RevocationJobEntity).findOne({
      where: {
        status: 'PENDING',
        nextRetryAt: LessThanOrEqual(now),
      },
      order: { createdAt: 'ASC' },
    });

    return job ? this.toDomain(job) : null;
  }

  async save(job: RevocationJob): Promise<void> {
    await this.dataSource.getRepository(RevocationJobEntity).save(job);
  }

  async isHashRevoked(hashToRevoke: string): Promise<boolean> {
    const found = await this.dataSource.getRepository(RevocationJobEntity).findOne({
      where: {
        hashToRevoke,
        status: 'COMPLETED',
      },
    });

    return Boolean(found);
  }

  private toDomain(entity: RevocationJobEntity): RevocationJob {
    return {
      id: entity.id,
      idempotencyKey: entity.idempotencyKey,
      eventId: entity.eventId,
      hashToRevoke: entity.hashToRevoke,
      status: entity.status,
      attemptCount: entity.attemptCount,
      maxAttempts: entity.maxAttempts,
      nextRetryAt: entity.nextRetryAt,
      txHash: entity.txHash,
      lastError: entity.lastError,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
