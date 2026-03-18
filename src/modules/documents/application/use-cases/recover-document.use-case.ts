import { RBACService } from '@/src/modules/users/domain/services/rbac.service';
import { DocumentFolioRepository } from '@/src/modules/documents/infrastructure/repositories/document-folio.repository';
import { AuditLogService } from '@/src/modules/audits/application/services/audit-log.service';
import { AuditAction } from '@/src/modules/audits/domain/enums/audit-action.enum';
import { StorageAdapter, RecoverDocumentDTO, RecoveryResult } from '@/src/modules/documents/domain/interfaces/storage.interface';
import { UserRepository } from '@/src/modules/users/infrastructure/repositories/user.repository';

export type { RecoverDocumentDTO };

/**
 * Caso de uso: Recuperar documento revocado/perdido (RF-09)
 * - Solo Admin/Auditor pueden recuperar
 * - Valida que el folio exista
 * - Recupera el PDF del storage
 * - Registra en auditoría
 */
export class RecoverDocumentUseCase {
  constructor(
    private documentFolioRepository: DocumentFolioRepository,
    private storageAdapter: StorageAdapter,
    private rbacService: RBACService,
    private userRepository: UserRepository,
    private auditLogService: AuditLogService,
  ) {}

  async execute(dto: RecoverDocumentDTO): Promise<RecoveryResult> {
    // 1. Validar que el usuario existe
    const requester = await this.userRepository.findById(dto.requesterUserId);
    if (!requester) {
      throw new Error(`Requester user with ID ${dto.requesterUserId} not found`);
    }

    // 2. Validar RBAC - solo ADMIN o AUDITOR pueden recuperar
    const hasRecoveryPermission = requester.rolesAssigned.some((role) =>
      this.rbacService.hasPermission(role, 'recover_document'),
    );

    if (!hasRecoveryPermission) {
      throw new Error(
        `User ${dto.requesterUserId} (${requester.rolesAssigned.join(',')}) lacks recovery permission`,
      );
    }

    // 3. Obtener folio del repositorio
    const folio = await this.documentFolioRepository.findById(dto.folioId);
    if (!folio) {
      throw new Error(`Document folio with ID ${dto.folioId} not found`);
    }

    // 4. Verificar que el PDF estía disponible en storage
    const pdfExists = await this.storageAdapter.exists(folio.pdfStorageUrl);
    if (!pdfExists) {
      throw new Error(
        `PDF for folio ${folio.institutionalFolio} is not available in storage (URL: ${folio.pdfStorageUrl})`,
      );
    }

    // 5. Recuperar el PDF del storage
    let pdfBuffer: Buffer;
    try {
      pdfBuffer = await this.storageAdapter.retrieve(folio.pdfStorageUrl);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(
        `Could not retrieve PDF for folio ${folio.institutionalFolio}: ${errorMessage}`,
      );
    }

    // 6. Construir resultado
    const result: RecoveryResult = {
      folioId: folio.id,
      institutionalFolio: folio.institutionalFolio,
      enrollmentId: folio.enrollmentId,
      originalDataHash: folio.originalDataHash,
      rawPayloadData: folio.rawPayloadData,
      pdfBuffer,
      recoveredAt: new Date(),
      recoveryReason: dto.reason,
    };

    // 7. Registrar en auditoría
    if (this.auditLogService) {
      await this.auditLogService.log({
        userId: dto.requesterUserId,
        action: AuditAction.RECOVER,
        affectedEntity: 'Documento_Folio',
        affectedEntityId: folio.id,
        detailSnapshot: {
          institutionalFolio: folio.institutionalFolio,
          enrollmentId: folio.enrollmentId,
          recoveryReason: dto.reason ?? 'Not specified',
        },
      });
    }

    return result;
  }
}
