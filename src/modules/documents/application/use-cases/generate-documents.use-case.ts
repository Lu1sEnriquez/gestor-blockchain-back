import { AuditLogService } from '@/src/modules/audits/application/services/audit-log.service';
import { AuditAction } from '@/src/modules/audits/domain/enums/audit-action.enum';
import { BatchType } from '@/src/modules/documents/domain/enums/batch-type.enum';
import { NetworkState } from '@/src/modules/documents/domain/enums/network-state.enum';
import { DocumentFolioEntity } from '@/src/modules/documents/infrastructure/entities/document-folio.entity';
import { DocumentFolioRepository } from '@/src/modules/documents/infrastructure/repositories/document-folio.repository';
import { EmissionBatchRepository } from '@/src/modules/documents/infrastructure/repositories/emission-batch.repository';
import { TemplateSequenceRepository } from '@/src/modules/documents/infrastructure/repositories/template-sequence.repository';
import { EventStatus } from '@/src/modules/events/domain/enums/event-status.enum';
import { EventStateService } from '@/src/modules/events/domain/services/event-state.service';
import { EventRepository } from '@/src/modules/events/infrastructure/repositories/event.repository';
import { RevocationQueueRepository } from '@/src/modules/events/application/sagas/revocation.saga';
import { DocumentTemplateRepository } from '@/src/modules/templates/infrastructure/repositories/document-template.repository';
import { RBACService } from '@/src/modules/users/domain/services/rbac.service';
import { UserRepository } from '@/src/modules/users/infrastructure/repositories/user.repository';
import { hashCanonicalJson } from '@/src/shared/crypto/hashing';
import { buildMerkleTree } from '@/src/shared/web3/merkle';
import { BlockchainAnchorAdapter } from '@/src/shared/web3/ethers-anchor.adapter';

export type GenerationInputRow = {
  enrollmentId: string;
  payload: Record<string, unknown>;
  pdfStorageUrl?: string;
};

export interface GenerateDocumentsDTO {
  eventId: string;
  generatorUserId: string;
  rows: GenerationInputRow[];
  batchType?: BatchType;
  revokedHashToReplace?: string;
}

export interface GenerateDocumentsResult {
  batchId: string;
  merkleRootHash: string;
  polygonTxHash: string | null;
  networkState: NetworkState;
  generatedCount: number;
  folios: string[];
}

export class GenerateDocumentsUseCase {
  constructor(
    private readonly eventRepository: EventRepository,
    private readonly userRepository: UserRepository,
    private readonly templateRepository: DocumentTemplateRepository,
    private readonly sequenceRepository: TemplateSequenceRepository,
    private readonly batchRepository: EmissionBatchRepository,
    private readonly folioRepository: DocumentFolioRepository,
    private readonly rbacService: RBACService,
    private readonly stateService: EventStateService,
    private readonly anchorAdapter: BlockchainAnchorAdapter,
    private readonly auditLogService?: AuditLogService,
    private readonly revocationQueueRepository?: RevocationQueueRepository,
  ) {}

  async execute(dto: GenerateDocumentsDTO): Promise<GenerateDocumentsResult> {
    if (dto.rows.length === 0) {
      throw new Error('rows cannot be empty');
    }

    const event = await this.eventRepository.findById(dto.eventId);
    if (!event) {
      throw new Error(`Event with ID ${dto.eventId} not found`);
    }

    const generator = await this.userRepository.findById(dto.generatorUserId);
    if (!generator) {
      throw new Error(`Generator user with ID ${dto.generatorUserId} not found`);
    }

    const canGenerate = generator.rolesAssigned.some((role) =>
      this.rbacService.hasPermission(role, 'generate_documents'),
    );
    if (!canGenerate) {
      throw new Error(
        `User ${dto.generatorUserId} (${generator.rolesAssigned.join(',')}) lacks generate_documents permission`,
      );
    }

    const batchType = dto.batchType ?? BatchType.ORIGINAL;
    const isComplementary = batchType === BatchType.COMPLEMENTARY;

    if (isComplementary) {
      if (!this.stateService.canGenerateComplementary(event.consensusStatus as EventStatus)) {
        throw new Error(
          `Cannot generate complementary documents when event is in state ${event.consensusStatus}; required SIGNED or COMPLETED`,
        );
      }

      if (!dto.revokedHashToReplace) {
        throw new Error('Complementary generation requires revokedHashToReplace');
      }

      if (!this.revocationQueueRepository) {
        throw new Error('Revocation repository is required for complementary generation');
      }

      const isRevoked = await this.revocationQueueRepository.isHashRevoked(dto.revokedHashToReplace);
      if (!isRevoked) {
        throw new Error(
          `Complementary generation requires a previously revoked hash: ${dto.revokedHashToReplace}`,
        );
      }
    } else if (!this.stateService.canLoadDocuments(event.consensusStatus as EventStatus)) {
      throw new Error(
        `Cannot generate documents when event is in state ${event.consensusStatus}; required SIGNED`,
      );
    }

    const template = await this.templateRepository.findById(event.templateId);
    if (!template) {
      throw new Error(`Template with ID ${event.templateId} not found`);
    }

    const year = new Date().getFullYear();

    const folioDrafts: Array<{
      enrollmentId: string;
      payload: Record<string, unknown>;
      originalDataHash: string;
      institutionalFolio: string;
      pdfStorageUrl: string;
    }> = [];

    for (const row of dto.rows) {
      const sequence = await this.sequenceRepository.reserveNextSequence(template.id, year);
      const institutionalFolio = `${template.folioPrefix}-${year}-${String(sequence).padStart(4, '0')}`;

      folioDrafts.push({
        enrollmentId: row.enrollmentId,
        payload: row.payload,
        originalDataHash: hashCanonicalJson(row.payload),
        institutionalFolio,
        pdfStorageUrl:
          row.pdfStorageUrl ??
          `https://storage.local/${event.id}/${institutionalFolio.replace(/\s+/g, '-')}.pdf`,
      });
    }

    const merkleRootHash = buildMerkleTree(folioDrafts.map((item) => item.originalDataHash)).root;

    const batch = this.batchRepository.create({
      eventId: event.id,
      batchType,
      merkleRootHash,
      networkState: event.web3Enabled ? NetworkState.QUEUED : NetworkState.CONFIRMED,
      polygonTxHash: null,
    });

    const savedBatch = await this.batchRepository.save(batch);

    const tx = event.web3Enabled
      ? await this.anchorAdapter.anchorMerkleRoot({ eventId: event.id, merkleRoot: merkleRootHash })
      : null;

    if (tx) {
      savedBatch.polygonTxHash = tx.txHash;
      savedBatch.networkState = NetworkState.CONFIRMED;
      await this.batchRepository.save(savedBatch);
    }

    const folioEntities = folioDrafts.map((draft) =>
      this.folioRepository.create({
        batchId: savedBatch.id,
        institutionalFolio: draft.institutionalFolio,
        enrollmentId: draft.enrollmentId,
        rawPayloadData: draft.payload,
        originalDataHash: draft.originalDataHash,
        pdfStorageUrl: draft.pdfStorageUrl,
        isValid: true,
      }),
    );

    const savedFolios = await this.folioRepository.saveMany(folioEntities as DocumentFolioEntity[]);

    event.consensusStatus = EventStatus.COMPLETED;
    await this.eventRepository.save(event);

    if (this.auditLogService) {
      await this.auditLogService.log({
        userId: dto.generatorUserId,
        action: AuditAction.GENERATE_DOCS,
        affectedEntity: 'Lote_Emision',
        affectedEntityId: savedBatch.id,
        detailSnapshot: {
          eventId: event.id,
          generatedCount: savedFolios.length,
          batchType,
          revokedHashToReplace: dto.revokedHashToReplace ?? null,
          merkleRootHash,
          polygonTxHash: savedBatch.polygonTxHash,
          folios: savedFolios.map((folio) => folio.institutionalFolio),
        },
      });
    }

    return {
      batchId: savedBatch.id,
      merkleRootHash,
      polygonTxHash: savedBatch.polygonTxHash,
      networkState: savedBatch.networkState,
      generatedCount: savedFolios.length,
      folios: savedFolios.map((folio) => folio.institutionalFolio),
    };
  }
}
