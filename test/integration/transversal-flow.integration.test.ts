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
  RevocationJob,
  RevocationQueueRepository,
  RevocationSagaService,
} from '@/src/modules/events/application/sagas/revocation.saga';
import {
  ProcessRevocationQueueUseCase,
  RevokeEventUseCase,
} from '@/src/modules/events/application/use-cases/revoke-event.use-case';
import { EventStatus } from '@/src/modules/events/domain/enums/event-status.enum';
import { EventStateService } from '@/src/modules/events/domain/services/event-state.service';
import { createEventsRouter } from '@/src/modules/events/presentation/http/events.router';
import { ReconcileStagingUseCase } from '@/src/modules/staging/application/use-cases/reconcile-staging.use-case';
import { DocumentFolioEntity } from '@/src/modules/documents/infrastructure/entities/document-folio.entity';
import { EmissionBatchEntity } from '@/src/modules/documents/infrastructure/entities/emission-batch.entity';
import { TemplateSequenceRepository } from '@/src/modules/documents/infrastructure/repositories/template-sequence.repository';
import { EventEntity } from '@/src/modules/events/infrastructure/entities/event.entity';
import { DocumentTemplateEntity } from '@/src/modules/templates/infrastructure/entities/document-template.entity';
import { UserRole } from '@/src/modules/users/domain/enums/user-role.enum';
import { RBACService } from '@/src/modules/users/domain/services/rbac.service';
import { UserEntity } from '@/src/modules/users/infrastructure/entities/user.entity';
import { VerifyDocumentUseCase } from '@/src/modules/verify/application/use-cases/verify-document.use-case';
import { createVerifyRouter } from '@/src/modules/verify/presentation/http/verify.router';
import { hashCanonicalJson } from '@/src/shared/crypto/hashing';
import { EthersAnchorAdapter } from '@/src/shared/web3/ethers-anchor.adapter';
import { EthersRevocationAdapter } from '@/src/shared/web3/ethers-revocation.adapter';
import { buildMerkleTree, getMerkleProof } from '@/src/shared/web3/merkle';

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
    return {
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
      templateName: 'Constancia',
      folioPrefix: 'ITSON',
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

  async findByOriginalDataHash(originalDataHash: string): Promise<DocumentFolioEntity | null> {
    return (
      Array.from(this.folios.values()).find((folio) => folio.originalDataHash === originalDataHash) ??
      null
    );
  }

  async save(entity: DocumentFolioEntity): Promise<DocumentFolioEntity> {
    this.folios.set(entity.id, entity);
    return entity;
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
      (job) =>
        job.status === 'PENDING' &&
        job.nextRetryAt.getTime() <= now.getTime() &&
        job.attemptCount < job.maxAttempts,
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

describe('Transversal flow integration', () => {
  it('covers create -> authorize -> sign -> reconcile -> generate -> verify -> revoke -> verify', async () => {
    const users = new Map<string, UserEntity>([
      ['creator-1', buildUser('creator-1', UserRole.CREATOR)],
      ['signer-1', buildUser('signer-1', UserRole.SIGNER)],
      ['admin-1', buildUser('admin-1', UserRole.ADMIN)],
    ]);

    const eventRepository = new InMemoryEventRepository();
    const userRepository = new InMemoryUserRepository(users);
    const revocationQueueRepository = new InMemoryRevocationQueueRepository();

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
    const signerConsensusRepository = new InMemorySignerConsensusRepository() as unknown as never;
    const consensusValidationService = new ConsensusValidationService(signerConsensusRepository);
    const signEventUseCase = new SignEventUseCase(
      eventRepository as unknown as never,
      userRepository as unknown as never,
      rbacService,
      stateService,
      consensusValidationService,
    );

    const folioRepository = new InMemoryDocumentFolioRepository();

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
      undefined,
      folioRepository as unknown as never,
    );
    const processRevocationQueueUseCase = new ProcessRevocationQueueUseCase(
      revocationSaga,
      folioRepository as unknown as never,
    );

    const reconcileStagingUseCase = new ReconcileStagingUseCase(
      eventRepository as unknown as never,
      userRepository as unknown as never,
      rbacService,
      stateService,
    );

    const generateDocumentsUseCase = new GenerateDocumentsUseCase(
      eventRepository as unknown as never,
      userRepository as unknown as never,
      new InMemoryTemplateRepository() as unknown as never,
      new InMemoryTemplateSequenceRepository() as unknown as TemplateSequenceRepository,
      new InMemoryEmissionBatchRepository() as unknown as never,
      folioRepository as unknown as never,
      rbacService,
      stateService,
      new EthersAnchorAdapter(),
      undefined,
      revocationQueueRepository,
    );

    const verifyUseCase = new VerifyDocumentUseCase(revocationQueueRepository);

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
    app.use(createVerifyRouter({ verifyDocumentUseCase: verifyUseCase }));

    const createResponse = await request(app).post('/events').send({
      templateId: 'template-001',
      eventName: 'Evento Integral',
      creatorUserId: 'creator-1',
    });

    expect(createResponse.status).toBe(201);
    const eventId = createResponse.body.id as string;

    const authorizeResponse = await request(app).post(`/events/${eventId}/authorize`).send({
      authorizerUserId: 'signer-1',
    });
    expect(authorizeResponse.status).toBe(200);

    const signResponse = await request(app).post(`/events/${eventId}/sign`).send({
      signerUserId: 'signer-1',
      documentHashes: ['h1', 'h2'],
    });
    expect(signResponse.status).toBe(200);
    expect(signResponse.body.consensusStatus).toBe(EventStatus.SIGNED);

    const reconcileResponse = await request(app).post(`/events/${eventId}/staging/reconcile`).send({
      operatorUserId: 'admin-1',
      declaredZones: ['norte', 'sur'],
      zipBundles: [
        { zone: 'norte', zipFileName: 'norte.zip' },
        { zone: 'sur', zipFileName: 'sur.zip' },
      ],
      rows: [
        { enrollmentId: '243410', zone: 'norte', payload: { matricula: '243410' } },
        { enrollmentId: '243410', zone: 'sur', payload: { matricula: '243410' } },
      ],
    });

    expect(reconcileResponse.status).toBe(200);
    expect(reconcileResponse.body.reconciledCount).toBe(1);
    expect(reconcileResponse.body.errorCount).toBe(0);

    const rowPayloadA = { matricula: '243410', nombre: 'Luis' };
    const rowPayloadB = { matricula: '243411', nombre: 'Ana' };

    const generateResponse = await request(app).post(`/events/${eventId}/generate`).send({
      generatorUserId: 'admin-1',
      rows: [
        { enrollmentId: '243410', payload: rowPayloadA },
        { enrollmentId: '243411', payload: rowPayloadB },
      ],
    });

    expect(generateResponse.status).toBe(201);
    expect(generateResponse.body.generatedCount).toBe(2);

    const leaves = [hashCanonicalJson(rowPayloadA), hashCanonicalJson(rowPayloadB)];
    const merkleRoot = buildMerkleTree(leaves).root;
    const proof = getMerkleProof(leaves, 0);

    const verifyValidResponse = await request(app).post('/verify').send({
      payload: rowPayloadA,
      merkleRoot,
      proof,
      expectedHash: leaves[0],
    });

    expect(verifyValidResponse.status).toBe(200);
    expect(verifyValidResponse.body.status).toBe('VALID');

    const revokeResponse = await request(app).post(`/events/${eventId}/revoke`).send({
      requesterUserId: 'admin-1',
      hashToRevoke: leaves[0],
      idempotencyKey: 'idem-transversal-1',
    });

    expect(revokeResponse.status).toBe(202);
    expect(revokeResponse.body.status).toBe('PENDING');

    const processRevocationsResponse = await request(app)
      .post('/events/revocations/process')
      .send({ requesterUserId: 'admin-1', maxJobs: 5 });

    expect(processRevocationsResponse.status).toBe(200);
    expect(processRevocationsResponse.body.processed).toBeGreaterThan(0);
    expect(processRevocationsResponse.body.completed).toBeGreaterThan(0);

    const revokedLocal = await folioRepository.findByOriginalDataHash(leaves[0]);
    expect(revokedLocal).not.toBeNull();
    expect(revokedLocal?.isValid).toBe(false);

    const verifyRevokedResponse = await request(app).post('/verify').send({
      payload: rowPayloadA,
      merkleRoot,
      proof,
      expectedHash: leaves[0],
    });

    expect(verifyRevokedResponse.status).toBe(200);
    expect(verifyRevokedResponse.body.status).toBe('REVOKED');
  });
});
