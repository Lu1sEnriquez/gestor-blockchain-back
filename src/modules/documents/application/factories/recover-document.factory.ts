import { RecoverDocumentUseCase } from '@/src/modules/documents/application/use-cases/recover-document.use-case';
import { LocalStorageAdapter } from '@/src/modules/documents/infrastructure/adapters/local-storage.adapter';
import { DocumentFolioRepository } from '@/src/modules/documents/infrastructure/repositories/document-folio.repository';
import { RBACService } from '@/src/modules/users/domain/services/rbac.service';
import { AuditLogService } from '@/src/modules/audits/application/services/audit-log.service';
import { TypeOrmAuditLogRepository } from '@/src/modules/audits/infrastructure/repositories/audit-log.repository';
import { UserRepository } from '@/src/modules/users/infrastructure/repositories/user.repository';
import { AppDataSource } from '@/src/shared/db/data-source';

export async function createRecoverDocumentUseCase(): Promise<RecoverDocumentUseCase> {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }

  const userRepository = new UserRepository(AppDataSource);
  const documentFolioRepository = new DocumentFolioRepository(AppDataSource);
  const rbacService = new RBACService();
  const auditLogRepository = new TypeOrmAuditLogRepository(AppDataSource);
  const auditLogService = new AuditLogService(auditLogRepository);
  const storageAdapter = new LocalStorageAdapter();

  return new RecoverDocumentUseCase(
    documentFolioRepository,
    storageAdapter,
    rbacService,
    userRepository,
    auditLogService,
  );
}
