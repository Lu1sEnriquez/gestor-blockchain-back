import { BatchType } from '@/src/modules/documents/domain/enums/batch-type.enum';
import { NetworkState } from '@/src/modules/documents/domain/enums/network-state.enum';
import { GenerateDocumentsUseCase } from '@/src/modules/documents/application/use-cases/generate-documents.use-case';
import { EventStatus } from '@/src/modules/events/domain/enums/event-status.enum';
import { EventStateService } from '@/src/modules/events/domain/services/event-state.service';
import { EventEntity } from '@/src/modules/events/infrastructure/entities/event.entity';
import { UserRole } from '@/src/modules/users/domain/enums/user-role.enum';
import { RBACService } from '@/src/modules/users/domain/services/rbac.service';
import { UserEntity } from '@/src/modules/users/infrastructure/entities/user.entity';

class InMemoryEventRepository {
  constructor(private readonly event: EventEntity) {}

  async findById(): Promise<EventEntity | null> {
    return this.event;
  }

  async save(entity: EventEntity): Promise<EventEntity> {
    return entity;
  }
}

class InMemoryUserRepository {
  async findById(): Promise<UserEntity | null> {
    return {
      id: 'admin-1',
      fullName: 'Admin',
      institutionalEmail: 'admin@itson.mx',
      rolesAssigned: [UserRole.ADMIN],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as UserEntity;
  }
}

class InMemoryTemplateRepository {
  async findById(): Promise<{ id: string; folioPrefix: string } | null> {
    return { id: 'template-1', folioPrefix: 'ITSON' };
  }
}

class InMemoryTemplateSequenceRepository {
  private counter = 0;

  async reserveNextSequence(): Promise<number> {
    this.counter += 1;
    return this.counter;
  }
}

class InMemoryBatchRepository {
  create(input: Record<string, unknown>) {
    return {
      id: 'batch-1',
      eventId: input.eventId,
      batchType: input.batchType,
      merkleRootHash: input.merkleRootHash,
      polygonTxHash: input.polygonTxHash,
      networkState: input.networkState ?? NetworkState.QUEUED,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  async save(entity: Record<string, unknown>) {
    return entity;
  }
}

class InMemoryFolioRepository {
  create(input: Record<string, unknown>) {
    return {
      id: `folio-${Math.random()}`,
      batchId: input.batchId,
      institutionalFolio: input.institutionalFolio,
      enrollmentId: input.enrollmentId,
      rawPayloadData: input.rawPayloadData,
      originalDataHash: input.originalDataHash,
      pdfStorageUrl: input.pdfStorageUrl,
      isValid: true,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  async saveMany(entities: Array<Record<string, unknown>>) {
    return entities;
  }
}

class AnchorAdapter {
  async anchorMerkleRoot() {
    return { txHash: '0xabc' };
  }
}

class RevocationRepository {
  constructor(private readonly revokedHashes: Set<string>) {}

  async isHashRevoked(hashToRevoke: string): Promise<boolean> {
    return this.revokedHashes.has(hashToRevoke);
  }
}

function buildEvent(status: EventStatus): EventEntity {
  return {
    id: 'event-1',
    eventName: 'Evento',
    templateId: 'template-1',
    creatorId: 'creator-1',
    consensusStatus: status,
    web3Enabled: true,
    globalContextInjected: {},
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as EventEntity;
}

describe('GenerateDocumentsUseCase - CU-12 complementario', () => {
  it('fails when complementary generation has no revoked hash proof', async () => {
    const useCase = new GenerateDocumentsUseCase(
      new InMemoryEventRepository(buildEvent(EventStatus.COMPLETED)) as unknown as never,
      new InMemoryUserRepository() as unknown as never,
      new InMemoryTemplateRepository() as unknown as never,
      new InMemoryTemplateSequenceRepository() as unknown as never,
      new InMemoryBatchRepository() as unknown as never,
      new InMemoryFolioRepository() as unknown as never,
      new RBACService(),
      new EventStateService(),
      new AnchorAdapter() as unknown as never,
      undefined,
      new RevocationRepository(new Set()) as unknown as never,
    );

    await expect(
      useCase.execute({
        eventId: 'event-1',
        generatorUserId: 'admin-1',
        batchType: BatchType.COMPLEMENTARY,
        revokedHashToReplace: 'a'.repeat(64),
        rows: [{ enrollmentId: '243410', payload: { matricula: '243410' } }],
      }),
    ).rejects.toThrow('requires a previously revoked hash');
  });

  it('generates complementary batch when revoked hash exists', async () => {
    const revokedHash = 'b'.repeat(64);

    const useCase = new GenerateDocumentsUseCase(
      new InMemoryEventRepository(buildEvent(EventStatus.COMPLETED)) as unknown as never,
      new InMemoryUserRepository() as unknown as never,
      new InMemoryTemplateRepository() as unknown as never,
      new InMemoryTemplateSequenceRepository() as unknown as never,
      new InMemoryBatchRepository() as unknown as never,
      new InMemoryFolioRepository() as unknown as never,
      new RBACService(),
      new EventStateService(),
      new AnchorAdapter() as unknown as never,
      undefined,
      new RevocationRepository(new Set([revokedHash])) as unknown as never,
    );

    const result = await useCase.execute({
      eventId: 'event-1',
      generatorUserId: 'admin-1',
      batchType: BatchType.COMPLEMENTARY,
      revokedHashToReplace: revokedHash,
      rows: [{ enrollmentId: '243410', payload: { matricula: '243410' } }],
    });

    expect(result.generatedCount).toBe(1);
    expect(result.polygonTxHash).toBe('0xabc');
    expect(result.folios[0]).toContain('ITSON-');
  });
});
