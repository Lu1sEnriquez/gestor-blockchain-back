export type RevocationJobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export type RevocationJob = {
  id: string;
  idempotencyKey: string;
  eventId: string;
  hashToRevoke: string;
  status: RevocationJobStatus;
  attemptCount: number;
  maxAttempts: number;
  nextRetryAt: Date;
  txHash?: string;
  lastError?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type QueueResult = {
  job: RevocationJob;
  created: boolean;
};

export interface RevocationQueueRepository {
  findByIdempotencyKey(idempotencyKey: string): Promise<RevocationJob | null>;
  create(job: RevocationJob): Promise<void>;
  findProcessable(now: Date): Promise<RevocationJob | null>;
  save(job: RevocationJob): Promise<void>;
  isHashRevoked(hashToRevoke: string): Promise<boolean>;
}

export interface BlockchainRevocationAdapter {
  revokeHash(hashToRevoke: string): Promise<{ txHash: string }>;
}

export class RevocationSagaService {
  constructor(
    private readonly queueRepository: RevocationQueueRepository,
    private readonly blockchainAdapter: BlockchainRevocationAdapter,
    private readonly baseBackoffMs = 1_000,
  ) {}

  async enqueueRevocation(input: {
    idempotencyKey: string;
    eventId: string;
    hashToRevoke: string;
    maxAttempts?: number;
  }): Promise<QueueResult> {
    const existing = await this.queueRepository.findByIdempotencyKey(input.idempotencyKey);
    if (existing) {
      return { job: existing, created: false };
    }

    const now = new Date();
    const job: RevocationJob = {
      id: buildJobId(input.idempotencyKey),
      idempotencyKey: input.idempotencyKey,
      eventId: input.eventId,
      hashToRevoke: input.hashToRevoke,
      status: 'PENDING',
      attemptCount: 0,
      maxAttempts: input.maxAttempts ?? 5,
      nextRetryAt: now,
      createdAt: now,
      updatedAt: now,
    };

    await this.queueRepository.create(job);

    return { job, created: true };
  }

  async processNext(now = new Date()): Promise<RevocationJob | null> {
    const job = await this.queueRepository.findProcessable(now);
    if (!job) {
      return null;
    }

    job.status = 'PROCESSING';
    job.updatedAt = new Date();
    await this.queueRepository.save(job);

    try {
      const tx = await this.blockchainAdapter.revokeHash(job.hashToRevoke);
      job.status = 'COMPLETED';
      job.txHash = tx.txHash;
      job.lastError = undefined;
      job.updatedAt = new Date();
      await this.queueRepository.save(job);
      return job;
    } catch (error) {
      job.attemptCount += 1;
      job.lastError = error instanceof Error ? error.message : 'Unknown revocation error';

      if (job.attemptCount >= job.maxAttempts) {
        job.status = 'FAILED';
      } else {
        job.status = 'PENDING';
        job.nextRetryAt = new Date(now.getTime() + this.calculateBackoffMs(job.attemptCount));
      }

      job.updatedAt = new Date();
      await this.queueRepository.save(job);
      return job;
    }
  }

  private calculateBackoffMs(attemptCount: number): number {
    return this.baseBackoffMs * 2 ** (attemptCount - 1);
  }
}

function buildJobId(idempotencyKey: string): string {
  return `revoke-${idempotencyKey}`;
}
