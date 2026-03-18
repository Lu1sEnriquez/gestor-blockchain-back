import express from 'express';
import request from 'supertest';

import {
  AuthorizeEventUseCase,
  CreateEventUseCase,
  SignEventUseCase,
} from '@/src/modules/events/application/use-cases/event.use-cases';
import { GenerateDocumentsUseCase } from '@/src/modules/documents/application/use-cases/generate-documents.use-case';
import { ConsensusValidationService } from '@/src/modules/events/domain/services/consensus-validation.service';
import { BatchType } from '@/src/modules/documents/domain/enums/batch-type.enum';
import { NetworkState } from '@/src/modules/documents/domain/enums/network-state.enum';
import {
  RevocationQueueRepository,
  RevocationSagaService,
  RevocationJob,
} from '@/src/modules/events/application/sagas/revocation.saga';
import {
  ProcessRevocationQueueUseCase,
  RevokeEventUseCase,
} from '@/src/modules/events/application/use-cases/revoke-event.use-case';
import { TemplateSequenceRepository } from '@/src/modules/documents/infrastructure/repositories/template-sequence.repository';
import { EventStatus } from '@/src/modules/events/domain/enums/event-status.enum';
import { EventStateService } from '@/src/modules/events/domain/services/event-state.service';
import { createEventsRouter } from '@/src/modules/events/presentation/http/events.router';
import { EthersAnchorAdapter } from '@/src/shared/web3/ethers-anchor.adapter';
import { ReconcileStagingUseCase } from '@/src/modules/staging/application/use-cases/reconcile-staging.use-case';
import { UserRole } from '@/src/modules/users/domain/enums/user-role.enum';
import { RBACService } from '@/src/modules/users/domain/services/rbac.service';
import { DocumentFolioEntity } from '@/src/modules/documents/infrastructure/entities/document-folio.entity';
import { EmissionBatchEntity } from '@/src/modules/documents/infrastructure/entities/emission-batch.entity';
import { EventEntity } from '@/src/modules/events/infrastructure/entities/event.entity';
import { DocumentTemplateEntity } from '@/src/modules/templates/infrastructure/entities/document-template.entity';
import { UserEntity } from '@/src/modules/users/infrastructure/entities/user.entity';
import { EthersRevocationAdapter } from '@/src/shared/web3/ethers-revocation.adapter';

class InMemorySignerConsensusRepository {
  async countByEventId(): Promise<number> {
    return 0; // No signers required - automatic consensus
  }

  async countApprovedByEventId(): Promise<number> {
    return 0;
  }

  async findByEventId() {
    return [];
  }
}

class InMemoryEventRepository {
  private events = new Map<string, EventEntity>();

  create(input: Partial<EventEntity>): EventEntity {
    const id = `event-${this.events.size + 1}`;
    const entity = {
      id,
      eventName: input.eventName ?? 'untitled',
      templateId: input.templateId ?? 'template-1',
      creatorId: input.creatorId ?? 'creator-1',
      consensusStatus: input.consensusStatus ?? EventStatus.PENDING,
      web3Enabled: true,
      globalContextInjected: input.globalContextInjected ?? {},
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as EventEntity;

    return entity;
  }

  async save(entity: EventEntity): Promise<EventEntity> {
    entity.updatedAt = new Date();
    this.events.set(entity.id, entity);
    return entity;
  }

  async findById(id: string): Promise<EventEntity | null> {
    return this.events.get(id) ?? null;
  }
}

class InMemoryUserRepository {
  constructor(private users: Map<string, UserEntity>) {}

  async findById(id: string): Promise<UserEntity | null> {
    return this.users.get(id) ?? null;
  }
}

class InMemoryTemplateRepository {
  private templates = new Map<string, DocumentTemplateEntity>();

  constructor() {
    this.templates.set('template-001', {
      id: 'template-001',
      templateName: 'Constancia base',
      folioPrefix: 'ITSON',
      craftSchemaJson: {},
      creatorId: 'creator-1',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as DocumentTemplateEntity);
    this.templates.set('template-002', {
      id: 'template-002',
      templateName: 'Constancia B',
      folioPrefix: 'ITSONB',
      craftSchemaJson: {},
      creatorId: 'creator-1',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as DocumentTemplateEntity);
  }

  async findById(id: string): Promise<DocumentTemplateEntity | null> {
    return this.templates.get(id) ?? null;
  }
}

class InMemoryTemplateSequenceRepository {
  private counters = new Map<string, number>();

  async reserveNextSequence(templateId: string, emissionYear: number): Promise<number> {
    const key = `${templateId}-${emissionYear}`;
    const current = this.counters.get(key) ?? 0;
    const next = current + 1;
    this.counters.set(key, next);
    return next;
  }
}

class InMemoryEmissionBatchRepository {
  private batches = new Map<string, EmissionBatchEntity>();

  create(input: Partial<EmissionBatchEntity>): EmissionBatchEntity {
    return {
      id: `batch-${this.batches.size + 1}`,
      eventId: input.eventId ?? 'event-1',
      batchType: input.batchType ?? BatchType.ORIGINAL,
      merkleRootHash: input.merkleRootHash ?? '',
      polygonTxHash: input.polygonTxHash ?? null,
      networkState: input.networkState ?? NetworkState.QUEUED,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as EmissionBatchEntity;
  }

  async save(entity: EmissionBatchEntity): Promise<EmissionBatchEntity> {
    this.batches.set(entity.id, entity);
    return entity;
  }
}

class InMemoryDocumentFolioRepository {
  private folios = new Map<string, DocumentFolioEntity>();
  private counter = 0;

  create(input: Partial<DocumentFolioEntity>): DocumentFolioEntity {
    this.counter += 1;
    return {
      id: `folio-${this.counter}`,
      batchId: input.batchId ?? 'batch-1',
      institutionalFolio: input.institutionalFolio ?? 'ITSON-0000',
      enrollmentId: input.enrollmentId ?? 'A000',
      rawPayloadData: input.rawPayloadData ?? {},
      originalDataHash: input.originalDataHash ?? '',
      pdfStorageUrl: input.pdfStorageUrl ?? 'https://storage.local/sample.pdf',
      isValid: input.isValid ?? true,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as DocumentFolioEntity;
  }

  async saveMany(entities: DocumentFolioEntity[]): Promise<DocumentFolioEntity[]> {
    entities.forEach((item) => this.folios.set(item.id, item));
    return entities;
  }
}

class InMemoryRevocationQueueRepository implements RevocationQueueRepository {
  private readonly jobs = new Map<string, RevocationJob>();

  async findByIdempotencyKey(idempotencyKey: string): Promise<RevocationJob | null> {
    return this.jobs.get(idempotencyKey) ?? null;
  }

  async create(job: RevocationJob): Promise<void> {
    this.jobs.set(job.idempotencyKey, { ...job });
  }

  async findProcessable(now: Date): Promise<RevocationJob | null> {
    const found = Array.from(this.jobs.values()).find(
      (job) => job.status === 'PENDING' && job.nextRetryAt.getTime() <= now.getTime(),
    );

    return found ? { ...found } : null;
  }

  async save(job: RevocationJob): Promise<void> {
    this.jobs.set(job.idempotencyKey, { ...job });
  }

  async isHashRevoked(hashToRevoke: string): Promise<boolean> {
    return Array.from(this.jobs.values()).some(
      (job) => job.hashToRevoke === hashToRevoke && job.status === 'COMPLETED',
    );
  }
}

function buildUser(id: string, role: UserRole): UserEntity {
  return {
    id,
    fullName: `${id}-name`,
    institutionalEmail: `${id}@itson.mx`,
    rolesAssigned: [role],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as UserEntity;
}

describe('Events API integration', () => {
  it('executes create -> authorize -> sign flow', async () => {
    const users = new Map<string, UserEntity>([
      ['creator-1', buildUser('creator-1', UserRole.CREATOR)],
      ['signer-1', buildUser('signer-1', UserRole.SIGNER)],
    ]);

    const eventRepository = new InMemoryEventRepository();
    const userRepository = new InMemoryUserRepository(users);

    const rbacService = new RBACService();
    const stateService = new EventStateService();
    const signerConsensusRepository = new InMemorySignerConsensusRepository() as unknown as never;
    const consensusValidationService = new ConsensusValidationService(signerConsensusRepository);

    const createEventUseCase = new CreateEventUseCase(
      eventRepository as unknown as never,
      userRepository as unknown as never,
      rbacService,
    );
    const authorizeEventUseCase = new AuthorizeEventUseCase(
      eventRepository as unknown as never,
      userRepository as unknown as never,
      rbacService,
      stateService,
    );
    const signEventUseCase = new SignEventUseCase(
      eventRepository as unknown as never,
      userRepository as unknown as never,
      rbacService,
      stateService,
      consensusValidationService,
    );
    const revocationQueueRepository = new InMemoryRevocationQueueRepository();
    const revocationSaga = new RevocationSagaService(
      revocationQueueRepository,
      new EthersRevocationAdapter(),
    );
    const revokeEventUseCase = new RevokeEventUseCase(
      eventRepository as unknown as never,
      userRepository as unknown as never,
      rbacService,
      stateService,
      revocationSaga,
    );
    const processRevocationQueueUseCase = new ProcessRevocationQueueUseCase(revocationSaga);
    const generateDocumentsUseCase = new GenerateDocumentsUseCase(
      eventRepository as unknown as never,
      userRepository as unknown as never,
      new InMemoryTemplateRepository() as unknown as never,
      new InMemoryTemplateSequenceRepository() as unknown as TemplateSequenceRepository,
      new InMemoryEmissionBatchRepository() as unknown as never,
      new InMemoryDocumentFolioRepository() as unknown as never,
      rbacService,
      stateService,
      new EthersAnchorAdapter(),
      undefined,
      revocationQueueRepository as unknown as never,
    );
    const reconcileStagingUseCase = new ReconcileStagingUseCase(
      eventRepository as unknown as never,
      userRepository as unknown as never,
      rbacService,
      stateService,
    );

    const app = express();
    app.use(express.json());
    app.use(
      createEventsRouter({
        createEventUseCase,
        authorizeEventUseCase,
        signEventUseCase,
        revokeEventUseCase,
        processRevocationQueueUseCase,
        generateDocumentsUseCase,
        reconcileStagingUseCase,
      }),
    );

    const createResponse = await request(app).post('/events').send({
      templateId: 'template-001',
      eventName: 'Evento de Titulacion',
      creatorUserId: 'creator-1',
    });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.consensusStatus).toBe(EventStatus.PENDING);

    const eventId = createResponse.body.id as string;

    const authorizeResponse = await request(app).post(`/events/${eventId}/authorize`).send({
      authorizerUserId: 'signer-1',
    });

    expect(authorizeResponse.status).toBe(200);
    expect(authorizeResponse.body.consensusStatus).toBe(EventStatus.AUTHORIZED);

    const signResponse = await request(app).post(`/events/${eventId}/sign`).send({
      signerUserId: 'signer-1',
      documentHashes: ['h1', 'h2'],
    });

    expect(signResponse.status).toBe(200);
    expect(signResponse.body.consensusStatus).toBe(EventStatus.SIGNED);

    const adminUser = buildUser('admin-1', UserRole.ADMIN);
    users.set(adminUser.id, adminUser);

    const reconcileResponse = await request(app).post(`/events/${eventId}/staging/reconcile`).send({
      operatorUserId: 'admin-1',
      declaredZones: ['norte', 'sur'],
      zipBundles: [
        { zone: 'norte', zipFileName: 'norte-lote-1.zip' },
        { zone: 'sur', zipFileName: 'sur-lote-1.zip' },
      ],
      rows: [
        { enrollmentId: '243410', zone: 'norte', payload: { matricula: '243410' } },
        { enrollmentId: '243410', zone: 'sur', payload: { matricula: '243410' } },
        { enrollmentId: '243411', zone: 'norte', payload: { matricula: '243411' } },
      ],
    });

    expect(reconcileResponse.status).toBe(200);
    expect(reconcileResponse.body.reconciledCount).toBe(1);
    expect(reconcileResponse.body.errorCount).toBe(1);

    const generateResponse = await request(app).post(`/events/${eventId}/generate`).send({
      generatorUserId: 'admin-1',
      rows: [
        {
          enrollmentId: '243410',
          payload: { matricula: '243410', nombre: 'Luis' },
        },
        {
          enrollmentId: '243411',
          payload: { matricula: '243411', nombre: 'Ana' },
        },
      ],
    });

    expect(generateResponse.status).toBe(201);
    expect(generateResponse.body.generatedCount).toBe(2);
    expect(generateResponse.body.folios[0]).toContain('ITSON-');

    const revokeResponse = await request(app).post(`/events/${eventId}/revoke`).send({
      requesterUserId: 'admin-1',
      hashToRevoke: 'a'.repeat(64),
      idempotencyKey: 'idem-revoke-1',
    });

    expect(revokeResponse.status).toBe(202);
    expect(revokeResponse.body.status).toBe('PENDING');

    const processRevocationsResponse = await request(app)
      .post('/events/revocations/process')
      .send({ requesterUserId: 'admin-1', maxJobs: 5 });

    expect(processRevocationsResponse.status).toBe(200);
    expect(processRevocationsResponse.body.processed).toBeGreaterThan(0);
    expect(processRevocationsResponse.body.completed).toBeGreaterThan(0);

    const complementaryResponse = await request(app).post(`/events/${eventId}/generate`).send({
      generatorUserId: 'admin-1',
      batchType: BatchType.COMPLEMENTARY,
      revokedHashToReplace: 'a'.repeat(64),
      rows: [
        {
          enrollmentId: '243410',
          payload: { matricula: '243410', nombre: 'Luis Complementario' },
        },
      ],
    });

    expect(complementaryResponse.status).toBe(201);
    expect(complementaryResponse.body.generatedCount).toBe(1);
    expect(complementaryResponse.body.folios[0]).toContain('ITSON-');
  });

  it('returns 403 when authorizer lacks permissions', async () => {
    const users = new Map<string, UserEntity>([
      ['creator-1', buildUser('creator-1', UserRole.CREATOR)],
      ['creator-2', buildUser('creator-2', UserRole.CREATOR)],
    ]);

    const eventRepository = new InMemoryEventRepository();
    const userRepository = new InMemoryUserRepository(users);

    const rbacService = new RBACService();
    const stateService = new EventStateService();

    const createEventUseCase = new CreateEventUseCase(
      eventRepository as unknown as never,
      userRepository as unknown as never,
      rbacService,
    );
    const authorizeEventUseCase = new AuthorizeEventUseCase(
      eventRepository as unknown as never,
      userRepository as unknown as never,
      rbacService,
      stateService,
    );
    const signerConsensusRepository2 = new InMemorySignerConsensusRepository() as unknown as never;
    const consensusValidationService2 = new ConsensusValidationService(signerConsensusRepository2);
    const signEventUseCase = new SignEventUseCase(
      eventRepository as unknown as never,
      userRepository as unknown as never,
      rbacService,
      stateService,
      consensusValidationService2,
    );
    const revocationSaga = new RevocationSagaService(
      new InMemoryRevocationQueueRepository(),
      new EthersRevocationAdapter(),
    );
    const revokeEventUseCase = new RevokeEventUseCase(
      eventRepository as unknown as never,
      userRepository as unknown as never,
      rbacService,
      stateService,
      revocationSaga,
    );
    const processRevocationQueueUseCase = new ProcessRevocationQueueUseCase(revocationSaga);
    const generateDocumentsUseCase = new GenerateDocumentsUseCase(
      eventRepository as unknown as never,
      userRepository as unknown as never,
      new InMemoryTemplateRepository() as unknown as never,
      new InMemoryTemplateSequenceRepository() as unknown as TemplateSequenceRepository,
      new InMemoryEmissionBatchRepository() as unknown as never,
      new InMemoryDocumentFolioRepository() as unknown as never,
      rbacService,
      stateService,
      new EthersAnchorAdapter(),
    );
    const reconcileStagingUseCase = new ReconcileStagingUseCase(
      eventRepository as unknown as never,
      userRepository as unknown as never,
      rbacService,
      stateService,
    );

    const app = express();
    app.use(express.json());
    app.use(
      createEventsRouter({
        createEventUseCase,
        authorizeEventUseCase,
        signEventUseCase,
        revokeEventUseCase,
        processRevocationQueueUseCase,
        generateDocumentsUseCase,
        reconcileStagingUseCase,
      }),
    );

    const created = await request(app).post('/events').send({
      templateId: 'template-002',
      eventName: 'Evento B',
      creatorUserId: 'creator-1',
    });

    const eventId = created.body.id as string;

    const response = await request(app).post(`/events/${eventId}/authorize`).send({
      authorizerUserId: 'creator-2',
    });

    expect(response.status).toBe(403);
    expect(response.body.error).toContain('lacks authorize_event permission');
  });
});
