import {
  ProcessRevocationQueueUseCase,
  RevokeEventUseCase,
} from '@/src/modules/events/application/use-cases/revoke-event.use-case';
import { EventStatus } from '@/src/modules/events/domain/enums/event-status.enum';
import { EventStateService } from '@/src/modules/events/domain/services/event-state.service';
import { EventEntity } from '@/src/modules/events/infrastructure/entities/event.entity';
import { EventRepository } from '@/src/modules/events/infrastructure/repositories/event.repository';
import {
  RevocationJob,
  RevocationSagaService,
} from '@/src/modules/events/application/sagas/revocation.saga';
import { RBACService } from '@/src/modules/users/domain/services/rbac.service';
import { UserRole } from '@/src/modules/users/domain/enums/user-role.enum';
import { UserEntity } from '@/src/modules/users/infrastructure/entities/user.entity';
import { UserRepository } from '@/src/modules/users/infrastructure/repositories/user.repository';
import { DocumentFolioRepository } from '@/src/modules/documents/infrastructure/repositories/document-folio.repository';

describe('RevokeEventUseCase', () => {
  it('enqueues revocation and returns pending job without processing inline', async () => {
    const mockEventRepository: Partial<EventRepository> = {
      findById: jest.fn().mockResolvedValue(buildEvent({ consensusStatus: EventStatus.COMPLETED })),
    };

    const mockUserRepository: Partial<UserRepository> = {
      findById: jest.fn().mockResolvedValue(buildUser({ rolesAssigned: [UserRole.ADMIN] })),
    };

    const queuedJob = buildJob({ status: 'PENDING', attemptCount: 0, txHash: undefined });
    const mockRevocationSaga: Partial<RevocationSagaService> = {
      enqueueRevocation: jest.fn().mockResolvedValue({ created: true, job: queuedJob }),
      processNext: jest.fn(),
    };

    const useCase = new RevokeEventUseCase(
      mockEventRepository as EventRepository,
      mockUserRepository as UserRepository,
      new RBACService(),
      new EventStateService(),
      mockRevocationSaga as RevocationSagaService,
    );

    const result = await useCase.execute({
      eventId: 'event-1',
      requesterUserId: 'admin-1',
      hashToRevoke: 'a'.repeat(64),
      idempotencyKey: 'idem-1',
    });

    expect(result.status).toBe('PENDING');
    expect((mockRevocationSaga.enqueueRevocation as jest.Mock).mock.calls).toHaveLength(1);
    expect((mockRevocationSaga.processNext as jest.Mock).mock.calls).toHaveLength(0);
  });
});

describe('ProcessRevocationQueueUseCase', () => {
  it('processes queue and invalidates folio on completed revocation', async () => {
    const completedJob = buildJob({
      status: 'COMPLETED',
      hashToRevoke: 'b'.repeat(64),
      txHash: '0xtx',
    });

    const mockRevocationSaga: Partial<RevocationSagaService> = {
      processNext: jest
        .fn()
        .mockResolvedValueOnce(completedJob)
        .mockResolvedValueOnce(null),
    };

    const mockDocumentFolioRepository: Partial<DocumentFolioRepository> = {
      findByOriginalDataHash: jest.fn().mockResolvedValue({
        id: 'folio-1',
        isValid: true,
      }),
      save: jest.fn().mockResolvedValue(undefined),
    };

    const useCase = new ProcessRevocationQueueUseCase(
      mockRevocationSaga as RevocationSagaService,
      mockDocumentFolioRepository as unknown as DocumentFolioRepository,
    );

    const result = await useCase.execute({ maxJobs: 5 });

    expect(result.processed).toBe(1);
    expect(result.completed).toBe(1);
    expect(result.failed).toBe(0);
    expect(result.pending).toBe(0);
    expect(mockDocumentFolioRepository.findByOriginalDataHash).toHaveBeenCalledWith('b'.repeat(64));
    expect(mockDocumentFolioRepository.save).toHaveBeenCalled();
  });
});

function buildEvent(overrides: Partial<EventEntity> = {}): EventEntity {
  return {
    id: 'event-1',
    eventName: 'Evento Prueba',
    templateId: 'template-1',
    creatorId: 'creator-1',
    consensusStatus: EventStatus.SIGNED,
    web3Enabled: true,
    globalContextInjected: {},
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as EventEntity;
}

function buildUser(overrides: Partial<UserEntity> = {}): UserEntity {
  return {
    id: 'admin-1',
    fullName: 'Admin',
    institutionalEmail: 'admin@itson.edu.mx',
    rolesAssigned: [UserRole.ADMIN],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as UserEntity;
}

function buildJob(overrides: Partial<RevocationJob> = {}): RevocationJob {
  return {
    id: 'revoke-idem-1',
    idempotencyKey: 'idem-1',
    eventId: 'event-1',
    hashToRevoke: 'a'.repeat(64),
    status: 'PENDING',
    attemptCount: 0,
    maxAttempts: 5,
    nextRetryAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}
