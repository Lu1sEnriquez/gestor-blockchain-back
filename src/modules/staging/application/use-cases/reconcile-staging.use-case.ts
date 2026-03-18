import { AuditLogService } from '@/src/modules/audits/application/services/audit-log.service';
import { AuditAction } from '@/src/modules/audits/domain/enums/audit-action.enum';
import { EventStatus } from '@/src/modules/events/domain/enums/event-status.enum';
import { EventStateService } from '@/src/modules/events/domain/services/event-state.service';
import { EventRepository } from '@/src/modules/events/infrastructure/repositories/event.repository';
import { RBACService } from '@/src/modules/users/domain/services/rbac.service';
import { UserRepository } from '@/src/modules/users/infrastructure/repositories/user.repository';

export type StagingRow = {
  enrollmentId: string;
  zone: string;
  payload?: Record<string, unknown>;
};

export type StagingZipBundle = {
  zone: string;
  zipFileName: string;
};

export interface ReconcileStagingDTO {
  eventId: string;
  operatorUserId: string;
  declaredZones: string[];
  rows: StagingRow[];
  zipBundles: StagingZipBundle[];
}

export interface StagingReconciliationError {
  enrollmentId: string;
  reason: string;
  missingZones: string[];
  duplicateZones: string[];
}

export interface ReconcileStagingResult {
  eventId: string;
  zonesDeclared: string[];
  totalRows: number;
  reconciledCount: number;
  errorCount: number;
  reconciledRows: Array<{ enrollmentId: string; zones: string[] }>;
  errors: StagingReconciliationError[];
}

export class ReconcileStagingUseCase {
  constructor(
    private readonly eventRepository: EventRepository,
    private readonly userRepository: UserRepository,
    private readonly rbacService: RBACService,
    private readonly stateService: EventStateService,
    private readonly auditLogService?: AuditLogService,
  ) {}

  async execute(dto: ReconcileStagingDTO): Promise<ReconcileStagingResult> {
    if (!Array.isArray(dto.rows) || dto.rows.length === 0) {
      throw new Error('rows cannot be empty');
    }

    const normalizedZones = normalizeZones(dto.declaredZones);
    if (normalizedZones.length === 0) {
      throw new Error('declaredZones cannot be empty');
    }

    if (!Array.isArray(dto.zipBundles) || dto.zipBundles.length === 0) {
      throw new Error('zipBundles cannot be empty');
    }

    validateZipBundles(dto.zipBundles, normalizedZones);

    const event = await this.eventRepository.findById(dto.eventId);
    if (!event) {
      throw new Error(`Event with ID ${dto.eventId} not found`);
    }

    const operator = await this.userRepository.findById(dto.operatorUserId);
    if (!operator) {
      throw new Error(`Operator user with ID ${dto.operatorUserId} not found`);
    }

    const canLoad = operator.rolesAssigned.some((role) =>
      this.rbacService.hasPermission(role, 'load_documents'),
    );
    if (!canLoad) {
      throw new Error(
        `User ${dto.operatorUserId} (${operator.rolesAssigned.join(',')}) lacks load_documents permission`,
      );
    }

    if (!this.stateService.canLoadDocuments(event.consensusStatus as EventStatus)) {
      throw new Error(
        `Cannot reconcile staging when event is in state ${event.consensusStatus}; required SIGNED`,
      );
    }

    const grouped = new Map<string, string[]>();

    for (const row of dto.rows) {
      if (!row.enrollmentId || !row.zone) {
        throw new Error('each row requires enrollmentId and zone');
      }

      const zone = row.zone.trim().toUpperCase();
      if (!normalizedZones.includes(zone)) {
        throw new Error(`row zone ${zone} is not part of declaredZones`);
      }

      const current = grouped.get(row.enrollmentId) ?? [];
      current.push(zone);
      grouped.set(row.enrollmentId, current);
    }

    const reconciledRows: Array<{ enrollmentId: string; zones: string[] }> = [];
    const errors: StagingReconciliationError[] = [];

    for (const [enrollmentId, zones] of grouped.entries()) {
      const zoneCount = new Map<string, number>();
      zones.forEach((zone) => zoneCount.set(zone, (zoneCount.get(zone) ?? 0) + 1));

      const duplicateZones = Array.from(zoneCount.entries())
        .filter(([, count]) => count > 1)
        .map(([zone]) => zone);

      const uniqueZones = Array.from(new Set(zones));
      const missingZones = normalizedZones.filter((zone) => !uniqueZones.includes(zone));

      if (duplicateZones.length === 0 && missingZones.length === 0) {
        reconciledRows.push({
          enrollmentId,
          zones: uniqueZones,
        });
      } else {
        errors.push({
          enrollmentId,
          reason:
            duplicateZones.length > 0
              ? 'duplicate zones for enrollment'
              : 'missing zones for enrollment',
          missingZones,
          duplicateZones,
        });
      }
    }

    const result: ReconcileStagingResult = {
      eventId: event.id,
      zonesDeclared: normalizedZones,
      totalRows: dto.rows.length,
      reconciledCount: reconciledRows.length,
      errorCount: errors.length,
      reconciledRows,
      errors,
    };

    if (this.auditLogService) {
      const snapshot: Record<string, unknown> = {
        eventId: result.eventId,
        zonesDeclared: result.zonesDeclared,
        totalRows: result.totalRows,
        reconciledCount: result.reconciledCount,
        errorCount: result.errorCount,
        reconciledRows: result.reconciledRows,
        errors: result.errors,
      };

      await this.auditLogService.log({
        userId: dto.operatorUserId,
        action: AuditAction.RECONCILE_STAGING,
        affectedEntity: 'Evento_Academico',
        affectedEntityId: event.id,
        detailSnapshot: snapshot,
      });
    }

    return result;
  }
}

function normalizeZones(zones: string[]): string[] {
  return Array.from(new Set(zones.map((zone) => zone.trim().toUpperCase()).filter(Boolean)));
}

function validateZipBundles(zipBundles: StagingZipBundle[], declaredZones: string[]): void {
  const byZone = new Map<string, number>();

  for (const bundle of zipBundles) {
    if (!bundle.zone || !bundle.zipFileName) {
      throw new Error('each zip bundle requires zone and zipFileName');
    }

    const zone = bundle.zone.trim().toUpperCase();
    if (!declaredZones.includes(zone)) {
      throw new Error(`zip bundle zone ${zone} is not part of declaredZones`);
    }

    byZone.set(zone, (byZone.get(zone) ?? 0) + 1);
  }

  const missingZipZones = declaredZones.filter((zone) => !byZone.has(zone));
  if (missingZipZones.length > 0) {
    throw new Error(`missing zip bundles for zones: ${missingZipZones.join(',')}`);
  }
}
