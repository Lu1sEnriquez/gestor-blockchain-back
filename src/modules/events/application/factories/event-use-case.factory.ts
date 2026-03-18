import {
  AuthorizeEventUseCase,
  CreateEventUseCase,
  GetEventUseCase,
  SignEventUseCase,
} from '@/src/modules/events/application/use-cases/event.use-cases';
import { GenerateDocumentsUseCase } from '@/src/modules/documents/application/use-cases/generate-documents.use-case';
import { ReconcileStagingUseCase } from '@/src/modules/staging/application/use-cases/reconcile-staging.use-case';
import { AuditLogService } from '@/src/modules/audits/application/services/audit-log.service';
import { TypeOrmAuditLogRepository } from '@/src/modules/audits/infrastructure/repositories/audit-log.repository';
import { DocumentFolioRepository } from '@/src/modules/documents/infrastructure/repositories/document-folio.repository';
import { EmissionBatchRepository } from '@/src/modules/documents/infrastructure/repositories/emission-batch.repository';
import { TemplateSequenceRepository } from '@/src/modules/documents/infrastructure/repositories/template-sequence.repository';
import { RevocationSagaService } from '@/src/modules/events/application/sagas/revocation.saga';
import {
  ProcessRevocationQueueUseCase,
  RevokeEventUseCase,
} from '@/src/modules/events/application/use-cases/revoke-event.use-case';
import { EventStateService } from '@/src/modules/events/domain/services/event-state.service';
import { ConsensusValidationService } from '@/src/modules/events/domain/services/consensus-validation.service';
import { TypeOrmRevocationQueueRepository } from '@/src/modules/events/infrastructure/repositories/revocation-queue.repository';
import { EventRepository } from '@/src/modules/events/infrastructure/repositories/event.repository';
import { SignerConsensusRepository } from '@/src/modules/events/infrastructure/repositories/signer-consensus.repository';
import { DocumentTemplateRepository } from '@/src/modules/templates/infrastructure/repositories/document-template.repository';
import { RBACService } from '@/src/modules/users/domain/services/rbac.service';
import { UserRepository } from '@/src/modules/users/infrastructure/repositories/user.repository';
import { EthersAnchorAdapter } from '@/src/shared/web3/ethers-anchor.adapter';
import { AppDataSource } from '@/src/shared/db/data-source';
import { EthersRevocationAdapter } from '@/src/shared/web3/ethers-revocation.adapter';

export async function createEventUseCases() {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }

  const userRepository = new UserRepository(AppDataSource);
  const eventRepository = new EventRepository(AppDataSource);
  const signerConsensusRepository = new SignerConsensusRepository(AppDataSource);
  const rbacService = new RBACService();
  const stateService = new EventStateService();
  const consensusValidationService = new ConsensusValidationService(signerConsensusRepository);
  const auditLogRepository = new TypeOrmAuditLogRepository(AppDataSource);
  const auditLogService = new AuditLogService(auditLogRepository);
  const revocationQueueRepository = new TypeOrmRevocationQueueRepository(AppDataSource);
  const revocationAdapter = new EthersRevocationAdapter();
  const anchorAdapter = new EthersAnchorAdapter();
  const templateRepository = new DocumentTemplateRepository(AppDataSource);
  const sequenceRepository = new TemplateSequenceRepository(AppDataSource);
  const batchRepository = new EmissionBatchRepository(AppDataSource);
  const folioRepository = new DocumentFolioRepository(AppDataSource);
  const revocationSaga = new RevocationSagaService(revocationQueueRepository, revocationAdapter);

  return {
    createEventUseCase: new CreateEventUseCase(
      eventRepository,
      userRepository,
      rbacService,
      auditLogService,
    ),
    getEventUseCase: new GetEventUseCase(
      eventRepository,
      userRepository,
      rbacService,
    ),
    authorizeEventUseCase: new AuthorizeEventUseCase(
      eventRepository,
      userRepository,
      rbacService,
      stateService,
      auditLogService,
    ),
    signEventUseCase: new SignEventUseCase(
      eventRepository,
      userRepository,
      rbacService,
      stateService,
      consensusValidationService,
      auditLogService,
    ),
    revokeEventUseCase: new RevokeEventUseCase(
      eventRepository,
      userRepository,
      rbacService,
      stateService,
      revocationSaga,
      auditLogService,
      folioRepository,
    ),
    processRevocationQueueUseCase: new ProcessRevocationQueueUseCase(
      revocationSaga,
      folioRepository,
      userRepository,
      rbacService,
    ),
    generateDocumentsUseCase: new GenerateDocumentsUseCase(
      eventRepository,
      userRepository,
      templateRepository,
      sequenceRepository,
      batchRepository,
      folioRepository,
      rbacService,
      stateService,
      anchorAdapter,
      auditLogService,
      revocationQueueRepository,
    ),
    reconcileStagingUseCase: new ReconcileStagingUseCase(
      eventRepository,
      userRepository,
      rbacService,
      stateService,
      auditLogService,
    ),
  };
}
