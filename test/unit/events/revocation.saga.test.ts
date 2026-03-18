import {
  BlockchainRevocationAdapter,
  RevocationJob,
  RevocationQueueRepository,
  RevocationSagaService,
} from '@/src/modules/events/application/sagas/revocation.saga';

class InMemoryRevocationQueueRepository implements RevocationQueueRepository {
  private readonly jobsByIdempotency = new Map<string, RevocationJob>();

  async findByIdempotencyKey(idempotencyKey: string): Promise<RevocationJob | null> {
    return this.jobsByIdempotency.get(idempotencyKey) ?? null;
  }

  async create(job: RevocationJob): Promise<void> {
    this.jobsByIdempotency.set(job.idempotencyKey, { ...job });
  }

  async findProcessable(now: Date): Promise<RevocationJob | null> {
    const jobs = Array.from(this.jobsByIdempotency.values());
    const found = jobs.find(
      (job) =>
        job.status === 'PENDING' &&
        job.nextRetryAt.getTime() <= now.getTime() &&
        job.attemptCount < job.maxAttempts,
    );

    return found ? { ...found } : null;
  }

  async save(job: RevocationJob): Promise<void> {
    this.jobsByIdempotency.set(job.idempotencyKey, { ...job });
  }

  async isHashRevoked(hashToRevoke: string): Promise<boolean> {
    return Array.from(this.jobsByIdempotency.values()).some(
      (job) => job.hashToRevoke === hashToRevoke && job.status === 'COMPLETED',
    );
  }
}

describe('RevocationSagaService', () => {
  it('enqueues only once by idempotency key', async () => {
    const queue = new InMemoryRevocationQueueRepository();
    const adapter: BlockchainRevocationAdapter = {
      revokeHash: jest.fn().mockResolvedValue({ txHash: '0xtx' }),
    };

    const saga = new RevocationSagaService(queue, adapter);

    const first = await saga.enqueueRevocation({
      idempotencyKey: 'idem-1',
      eventId: 'event-1',
      hashToRevoke: 'hash-1',
    });

    const second = await saga.enqueueRevocation({
      idempotencyKey: 'idem-1',
      eventId: 'event-1',
      hashToRevoke: 'hash-1',
    });

    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(second.job.id).toBe(first.job.id);
  });

  it('marks job as completed when blockchain revocation succeeds', async () => {
    const queue = new InMemoryRevocationQueueRepository();
    const adapter: BlockchainRevocationAdapter = {
      revokeHash: jest.fn().mockResolvedValue({ txHash: '0xabc123' }),
    };

    const saga = new RevocationSagaService(queue, adapter);

    await saga.enqueueRevocation({
      idempotencyKey: 'idem-2',
      eventId: 'event-2',
      hashToRevoke: 'hash-2',
    });

    const result = await saga.processNext(new Date());

    expect(result?.status).toBe('COMPLETED');
    expect(result?.txHash).toBe('0xabc123');
  });

  it('retries with exponential backoff on failure', async () => {
    const queue = new InMemoryRevocationQueueRepository();
    const adapter: BlockchainRevocationAdapter = {
      revokeHash: jest.fn().mockRejectedValue(new Error('RPC down')),
    };

    const saga = new RevocationSagaService(queue, adapter, 1_000);

    await saga.enqueueRevocation({
      idempotencyKey: 'idem-3',
      eventId: 'event-3',
      hashToRevoke: 'hash-3',
      maxAttempts: 3,
    });

    const processAt = new Date(Date.now() + 60_000);
    const firstAttempt = await saga.processNext(processAt);

    expect(firstAttempt?.status).toBe('PENDING');
    expect(firstAttempt?.attemptCount).toBe(1);
    expect(firstAttempt?.nextRetryAt.getTime()).toBe(processAt.getTime() + 1_000);
  });

  it('marks job as failed after max attempts', async () => {
    const queue = new InMemoryRevocationQueueRepository();
    const adapter: BlockchainRevocationAdapter = {
      revokeHash: jest.fn().mockRejectedValue(new Error('Permanent error')),
    };

    const saga = new RevocationSagaService(queue, adapter, 10);

    await saga.enqueueRevocation({
      idempotencyKey: 'idem-4',
      eventId: 'event-4',
      hashToRevoke: 'hash-4',
      maxAttempts: 1,
    });

    const result = await saga.processNext(new Date());

    expect(result?.status).toBe('FAILED');
    expect(result?.attemptCount).toBe(1);
    expect(result?.lastError).toContain('Permanent error');
  });
});
