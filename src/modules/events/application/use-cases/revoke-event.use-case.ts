import { EventStatus } from '@/src/modules/events/domain/enums/event-status.enum';
import { EventStateService } from '@/src/modules/events/domain/services/event-state.service';
import { EventRepository } from '@/src/modules/events/infrastructure/repositories/event.repository';
import {
  RevocationSagaService,
  RevocationJob,
} from '@/src/modules/events/application/sagas/revocation.saga';
import { RBACService } from '@/src/modules/users/domain/services/rbac.service';
import { UserRepository } from '@/src/modules/users/infrastructure/repositories/user.repository';
import { AuditAction } from '@/src/modules/audits/domain/enums/audit-action.enum';
import { AuditLogService } from '@/src/modules/audits/application/services/audit-log.service';
import { DocumentFolioRepository } from '@/src/modules/documents/infrastructure/repositories/document-folio.repository';

export interface RevokeEventDTO {
  eventId: string;
  requesterUserId: string;
  hashToRevoke: string;
  idempotencyKey: string;
}

export interface ProcessRevocationQueueDTO {
  requesterUserId?: string;
  maxJobs?: number;
  now?: Date;
}

export interface ProcessRevocationQueueResult {
  processed: number;
  completed: number;
  failed: number;
  pending: number;
}

export class RevokeEventUseCase {
  constructor(
    private readonly eventRepository: EventRepository,
    private readonly userRepository: UserRepository,
    private readonly rbacService: RBACService,
    private readonly stateService: EventStateService,
    private readonly revocationSaga: RevocationSagaService,
    private readonly auditLogService?: AuditLogService,
    private readonly documentFolioRepository?: DocumentFolioRepository,
  ) {}

  async execute(dto: RevokeEventDTO): Promise<RevocationJob> {
    const event = await this.eventRepository.findById(dto.eventId);
    if (!event) {
      throw new Error(`Event with ID ${dto.eventId} not found`);
    }

    const requester = await this.userRepository.findById(dto.requesterUserId);
    if (!requester) {
      throw new Error(`Requester user with ID ${dto.requesterUserId} not found`);
    }

    const canRevoke = requester.rolesAssigned.some((role) => this.rbacService.canRevokeHash(role));
    if (!canRevoke) {
      throw new Error(
        `User ${dto.requesterUserId} (${requester.rolesAssigned.join(',')}) lacks revoke_hash permission`,
      );
    }

    if (!this.stateService.canBeRevoked(event.consensusStatus as EventStatus)) {
      throw new Error(`Event ${dto.eventId} cannot be revoked from state ${event.consensusStatus}`);
    }

    const enqueue = await this.revocationSaga.enqueueRevocation({
      idempotencyKey: dto.idempotencyKey,
      eventId: dto.eventId,
      hashToRevoke: dto.hashToRevoke,
    });

    const resultJob = enqueue.job;

    if (resultJob.status === 'COMPLETED' && this.documentFolioRepository) {
      const folio = await this.documentFolioRepository.findByOriginalDataHash(dto.hashToRevoke);
      if (folio && folio.isValid) {
        folio.isValid = false;
        await this.documentFolioRepository.save(folio);
      }
    }

    if (this.auditLogService) {
      await this.auditLogService.log({
        userId: dto.requesterUserId,
        action: AuditAction.REVOKE,
        affectedEntity: 'Documento_Folio',
        affectedEntityId: dto.hashToRevoke,
        detailSnapshot: {
          eventId: dto.eventId,
          revocationStatus: resultJob.status,
          txHash: resultJob.txHash ?? null,
          attempts: resultJob.attemptCount,
        },
      });
    }

    return resultJob;
  }
}

export class ProcessRevocationQueueUseCase {
  constructor(
    private readonly revocationSaga: RevocationSagaService,
    private readonly documentFolioRepository?: DocumentFolioRepository,
    private readonly userRepository?: UserRepository,
    private readonly rbacService?: RBACService,
  ) {}

  async execute(dto: ProcessRevocationQueueDTO = {}): Promise<ProcessRevocationQueueResult> {
    if (this.userRepository && this.rbacService) {
      if (!dto.requesterUserId) {
        throw new Error('requesterUserId is required');
      }

      const requester = await this.userRepository.findById(dto.requesterUserId);
      if (!requester) {
        throw new Error(`Requester user with ID ${dto.requesterUserId} not found`);
      }

      const canProcess = requester.rolesAssigned.some((role) =>
        this.rbacService!.canRevokeHash(role),
      );

      if (!canProcess) {
        throw new Error(
          `User ${dto.requesterUserId} (${requester.rolesAssigned.join(',')}) lacks revoke_hash permission`,
        );
      }
    }

    const maxJobs = Math.max(1, Math.min(dto.maxJobs ?? 10, 100));
    const now = dto.now ?? new Date();

    let processed = 0;
    let completed = 0;
    let failed = 0;
    let pending = 0;

    for (let index = 0; index < maxJobs; index += 1) {
      const job = await this.revocationSaga.processNext(now);
      if (!job) {
        break;
      }

      processed += 1;

      if (job.status === 'COMPLETED') {
        completed += 1;

        if (this.documentFolioRepository) {
          const folio = await this.documentFolioRepository.findByOriginalDataHash(job.hashToRevoke);
          if (folio && folio.isValid) {
            folio.isValid = false;
            await this.documentFolioRepository.save(folio);
          }
        }

        continue;
      }

      if (job.status === 'FAILED') {
        failed += 1;
        continue;
      }

      pending += 1;
    }

    return {
      processed,
      completed,
      failed,
      pending,
    };
  }
}
