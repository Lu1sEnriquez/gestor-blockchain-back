import { EventStatus } from '@/src/modules/events/domain/enums/event-status.enum';
import { EventStateService } from '@/src/modules/events/domain/services/event-state.service';
import { ConsensusValidationService } from '@/src/modules/events/domain/services/consensus-validation.service';
import { RBACService } from '@/src/modules/users/domain/services/rbac.service';
import { EventRepository } from '@/src/modules/events/infrastructure/repositories/event.repository';
import { UserRepository } from '@/src/modules/users/infrastructure/repositories/user.repository';
import { EventEntity } from '@/src/modules/events/infrastructure/entities/event.entity';
import { AuditAction } from '@/src/modules/audits/domain/enums/audit-action.enum';
import { AuditLogService } from '@/src/modules/audits/application/services/audit-log.service';

/**
 * DTO para crear un evento
 */
export interface CreateEventDTO {
  templateId: string;
  eventName: string;
  creatorUserId: string;
  globalContextInjected?: Record<string, unknown>;
}

/**
 * Caso de uso: Crear un nuevo evento
 * - Valida que el usuario CREATOR sea válido
 * - Inicializa estado en PENDIENTE
 * - Persiste en base de datos
 */
export class CreateEventUseCase {
  constructor(
    private eventRepository: EventRepository,
    private userRepository: UserRepository,
    private rbacService: RBACService,
    private auditLogService?: AuditLogService,
  ) {}

  async execute(dto: CreateEventDTO): Promise<EventEntity> {
    // Validar que el usuario existe y tiene rol CREATOR
    const creator = await this.userRepository.findById(dto.creatorUserId);
    if (!creator) {
      throw new Error(`Creator user with ID ${dto.creatorUserId} not found`);
    }

    const hasCreatePermission = creator.rolesAssigned.some(
      (role) => this.rbacService.hasPermission(role, 'create_event'),
    );

    if (!hasCreatePermission) {
      throw new Error(`User ${dto.creatorUserId} lacks create_event permission`);
    }

    // Crear evento en estado PENDIENTE
    const event = this.eventRepository.create({
      templateId: dto.templateId,
      eventName: dto.eventName,
      creatorId: dto.creatorUserId,
      consensusStatus: EventStatus.PENDING,
      globalContextInjected: dto.globalContextInjected ?? {},
    });

    const created = await this.eventRepository.save(event);

    if (this.auditLogService) {
      await this.auditLogService.log({
        userId: dto.creatorUserId,
        action: AuditAction.CREATE,
        affectedEntity: 'Evento_Academico',
        affectedEntityId: created.id,
        detailSnapshot: {
          eventName: created.eventName,
          templateId: created.templateId,
          status: created.consensusStatus,
        },
      });
    }

    return created;
  }
}

/**
 * DTO para autorizar evento
 */
export interface AuthorizeEventDTO {
  eventId: string;
  authorizerUserId: string;
}

/**
 * Caso de uso: Autorizar evento (PENDIENTE → AUTORIZADO)
 * - Valida transición de estado
 * - Valida RBAC (SIGNER o ADMIN)
 * - Actualiza estado
 */
export class AuthorizeEventUseCase {
  constructor(
    private eventRepository: EventRepository,
    private userRepository: UserRepository,
    private rbacService: RBACService,
    private stateService: EventStateService,
    private auditLogService?: AuditLogService,
  ) {}

  async execute(dto: AuthorizeEventDTO): Promise<EventEntity> {
    // Obtener evento
    const event = await this.eventRepository.findById(dto.eventId);
    if (!event) {
      throw new Error(`Event with ID ${dto.eventId} not found`);
    }

    // Obtener usuario autorizador
    const authorizer = await this.userRepository.findById(dto.authorizerUserId);
    if (!authorizer) {
      throw new Error(`Authorizer user with ID ${dto.authorizerUserId} not found`);
    }

    // Validar RBAC - alguno de los roles asignados debe tener permiso
    const canAuthorize = authorizer.rolesAssigned.some((role) =>
      this.rbacService.canAuthorize(role),
    );

    if (!canAuthorize) {
      throw new Error(
        `User ${dto.authorizerUserId} (${authorizer.rolesAssigned.join(',')}) lacks authorize_event permission`,
      );
    }

    // Validar transición de estado
    if (!this.stateService.canTransition(event.consensusStatus as EventStatus, EventStatus.AUTHORIZED)) {
      throw new Error(
        `Cannot transition event from ${event.consensusStatus} to ${EventStatus.AUTHORIZED}`,
      );
    }

    // Actualizar evento
    event.consensusStatus = EventStatus.AUTHORIZED;
    const updated = await this.eventRepository.save(event);

    if (this.auditLogService) {
      await this.auditLogService.log({
        userId: dto.authorizerUserId,
        action: AuditAction.AUTHORIZE,
        affectedEntity: 'Evento_Academico',
        affectedEntityId: updated.id,
        detailSnapshot: {
          status: updated.consensusStatus,
        },
      });
    }

    return updated;
  }
}

/**
 * DTO para firmar evento
 */
export interface SignEventDTO {
  eventId: string;
  signerUserId: string;
  documentHashes: string[];
}

export interface GetEventDTO {
  eventId: string;
  requesterUserId: string;
}

/**
 * Caso de uso: Firmar evento (AUTORIZADO → FIRMADO)
 * - Valida transición de estado
 * - Valida RBAC (SIGNER o ADMIN)
 * - Valida consenso multi-firmante (todos los signatarios deben aprobar)
 * - Persiste cambio de estado
 */
export class SignEventUseCase {
  constructor(
    private eventRepository: EventRepository,
    private userRepository: UserRepository,
    private rbacService: RBACService,
    private stateService: EventStateService,
    private consensusValidationService: ConsensusValidationService,
    private auditLogService?: AuditLogService,
  ) {}

  async execute(dto: SignEventDTO): Promise<EventEntity> {
    // Obtener evento
    const event = await this.eventRepository.findById(dto.eventId);
    if (!event) {
      throw new Error(`Event with ID ${dto.eventId} not found`);
    }

    // Obtener usuario firmante
    const signer = await this.userRepository.findById(dto.signerUserId);
    if (!signer) {
      throw new Error(`Signer user with ID ${dto.signerUserId} not found`);
    }

    // Validar RBAC - alguno de los roles asignados debe tener permiso
    const canSign = signer.rolesAssigned.some((role) => this.rbacService.canSign(role));

    if (!canSign) {
      throw new Error(
        `User ${dto.signerUserId} (${signer.rolesAssigned.join(',')}) lacks sign_event permission`,
      );
    }

    // Validar transición de estado
    if (!this.stateService.canTransition(event.consensusStatus as EventStatus, EventStatus.SIGNED)) {
      throw new Error(`Cannot transition event from ${event.consensusStatus} to ${EventStatus.SIGNED}`);
    }

    // Validar consenso multi-firmante: todos los signatarios deben haber aprobado
    const hasCompleteConsensus = await this.consensusValidationService.hasCompleteConsensus(
      dto.eventId,
    );

    if (!hasCompleteConsensus) {
      const { approved, total } = await this.consensusValidationService.getConsensusStatus(
        dto.eventId,
      );
      throw new Error(
        `Cannot sign event: incomplete consensus (${approved}/${total} signers approved)`,
      );
    }

    // Actualizar evento a FIRMADO
    event.consensusStatus = EventStatus.SIGNED;
    const updated = await this.eventRepository.save(event);

    if (this.auditLogService) {
      const consensusStatus = await this.consensusValidationService.getConsensusStatus(
        dto.eventId,
      );
      await this.auditLogService.log({
        userId: dto.signerUserId,
        action: AuditAction.SIGN,
        affectedEntity: 'Evento_Academico',
        affectedEntityId: updated.id,
        detailSnapshot: {
          status: updated.consensusStatus,
          documentsSigned: dto.documentHashes.length,
          consensusApproved: `${consensusStatus.approved}/${consensusStatus.total}`,
        },
      });
    }

    return updated;
  }
}

/**
 * Caso de uso: Obtener evento por ID
 * - Valida que el evento exista
 * - Valida que el usuario solicitante exista
 * - Permite acceso a ADMIN/SIGNER/AUDITOR o al creador del evento
 */
export class GetEventUseCase {
  constructor(
    private eventRepository: EventRepository,
    private userRepository: UserRepository,
    private rbacService: RBACService,
  ) {}

  async execute(dto: GetEventDTO): Promise<EventEntity> {
    const event = await this.eventRepository.findById(dto.eventId);
    if (!event) {
      throw new Error(`Event with ID ${dto.eventId} not found`);
    }

    const requester = await this.userRepository.findById(dto.requesterUserId);
    if (!requester) {
      throw new Error(`Requester user with ID ${dto.requesterUserId} not found`);
    }

    const canViewAllEvents = requester.rolesAssigned.some(
      (role) =>
        this.rbacService.hasPermission(role, 'view_all_events') ||
        this.rbacService.canSign(role) ||
        this.rbacService.canAuthorize(role) ||
        this.rbacService.canLoadDocuments(role),
    );

    const isEventOwner = event.creatorId === requester.id;

    if (!canViewAllEvents && !isEventOwner) {
      throw new Error(
        `User ${dto.requesterUserId} (${requester.rolesAssigned.join(',')}) lacks view_event permission`,
      );
    }

    return event;
  }
}
