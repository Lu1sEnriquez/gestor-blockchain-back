import { RecoverDocumentUseCase, RecoverDocumentDTO } from '@/src/modules/documents/application/use-cases/recover-document.use-case';
import { StorageAdapter } from '@/src/modules/documents/domain/interfaces/storage.interface';
import { RBACService } from '@/src/modules/users/domain/services/rbac.service';
import { DocumentFolioRepository } from '@/src/modules/documents/infrastructure/repositories/document-folio.repository';
import { AuditLogService } from '@/src/modules/audits/application/services/audit-log.service';
import { UserRepository } from '@/src/modules/users/infrastructure/repositories/user.repository';

describe('RecoverDocumentUseCase - Unit Tests', () => {
  let useCase: RecoverDocumentUseCase;
  let mockFolioRepository: Partial<DocumentFolioRepository>;
  let mockStorageAdapter: Partial<StorageAdapter>;
  let mockRbacService: Partial<RBACService>;
  let mockUserRepository: Partial<UserRepository>;
  let mockAuditLogService: Partial<AuditLogService>;

  beforeEach(() => {
    mockFolioRepository = {
      findById: jest.fn(),
    };

    mockStorageAdapter = {
      retrieve: jest.fn(),
      exists: jest.fn(),
    };

    mockRbacService = {
      hasPermission: jest.fn(),
    };

    mockUserRepository = {
      findById: jest.fn(),
    };

    mockAuditLogService = {
      log: jest.fn(),
    };

    useCase = new RecoverDocumentUseCase(
      mockFolioRepository as DocumentFolioRepository,
      mockStorageAdapter as StorageAdapter,
      mockRbacService as RBACService,
      mockUserRepository as UserRepository,
      mockAuditLogService as AuditLogService,
    );
  });

  describe('execute', () => {
    it('should allow ADMIN to recover a document', async () => {
      const dto: RecoverDocumentDTO = {
        folioId: 'folio-123',
        requesterUserId: 'admin-user-1',
        reason: 'Emergency recovery',
      };

      const mockFolio = {
        id: dto.folioId,
        institutionalFolio: 'ITSON-001-2026',
        enrollmentId: 'E001',
        originalDataHash: 'hash123',
        rawPayloadData: { name: 'Test', matricula: 'E001' },
        pdfStorageUrl: 's3://bucket/folio-123.pdf',
        isValue: true,
      };

      const pdfBuffer = Buffer.from('fake pdf content');

      (mockRbacService.hasPermission as jest.Mock).mockReturnValue(true);
      (mockUserRepository.findById as jest.Mock).mockResolvedValue({
        id: dto.requesterUserId,
        rolesAssigned: ['ADMIN'],
      });
      (mockFolioRepository.findById as jest.Mock).mockResolvedValue(mockFolio);
      (mockStorageAdapter.exists as jest.Mock).mockResolvedValue(true);
      (mockStorageAdapter.retrieve as jest.Mock).mockResolvedValue(pdfBuffer);
      (mockAuditLogService.log as jest.Mock).mockResolvedValue(undefined);

      const result = await useCase.execute(dto);

      expect(result.folioId).toBe(dto.folioId);
      expect(result.institutionalFolio).toBe('ITSON-001-2026');
      expect(result.pdfBuffer).toEqual(pdfBuffer);
      expect(mockAuditLogService.log).toHaveBeenCalled();
    });

    it('should allow AUDITOR to recover a document', async () => {
      const dto: RecoverDocumentDTO = {
        folioId: 'folio-456',
        requesterUserId: 'auditor-user-1',
      };

      const mockFolio = {
        id: dto.folioId,
        institutionalFolio: 'ITSON-002-2026',
        enrollmentId: 'E002',
        originalDataHash: 'hash456',
        rawPayloadData: { name: 'Test2' },
        pdfStorageUrl: 's3://bucket/folio-456.pdf',
      };

      const pdfBuffer = Buffer.from('another pdf');

      (mockRbacService.hasPermission as jest.Mock).mockReturnValue(true);
      (mockUserRepository.findById as jest.Mock).mockResolvedValue({
        id: dto.requesterUserId,
        rolesAssigned: ['AUDITOR'],
      });
      (mockFolioRepository.findById as jest.Mock).mockResolvedValue(mockFolio);
      (mockStorageAdapter.exists as jest.Mock).mockResolvedValue(true);
      (mockStorageAdapter.retrieve as jest.Mock).mockResolvedValue(pdfBuffer);

      const result = await useCase.execute(dto);

      expect(result.enrollmentId).toBe('E002');
      expect(result.pdfBuffer).toEqual(pdfBuffer);
    });

    it('should reject recovery if user lacks permission', async () => {
      const dto: RecoverDocumentDTO = {
        folioId: 'folio-123',
        requesterUserId: 'creator-user-1',
      };

      (mockRbacService.hasPermission as jest.Mock).mockReturnValue(false);
      (mockUserRepository.findById as jest.Mock).mockResolvedValue({
        id: dto.requesterUserId,
        rolesAssigned: ['CREATOR'],
      });

      await expect(useCase.execute(dto)).rejects.toThrow('lacks recovery permission');

      expect(mockFolioRepository.findById).not.toHaveBeenCalled();
    });

    it('should reject recovery if folio not found', async () => {
      const dto: RecoverDocumentDTO = {
        folioId: 'nonexistent-folio',
        requesterUserId: 'admin-user-1',
      };

      (mockRbacService.hasPermission as jest.Mock).mockReturnValue(true);
      (mockUserRepository.findById as jest.Mock).mockResolvedValue({
        id: dto.requesterUserId,
        rolesAssigned: ['ADMIN'],
      });
      (mockFolioRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(useCase.execute(dto)).rejects.toThrow('not found');

      expect(mockStorageAdapter.retrieve).not.toHaveBeenCalled();
    });

    it('should reject recovery if PDF not in storage', async () => {
      const dto: RecoverDocumentDTO = {
        folioId: 'folio-lost',
        requesterUserId: 'admin-user-1',
      };

      const mockFolio = {
        id: dto.folioId,
        institutionalFolio: 'ITSON-LOST-2026',
        enrollmentId: 'E999',
        pdfStorageUrl: 's3://bucket/folio-lost.pdf',
      };

      (mockRbacService.hasPermission as jest.Mock).mockReturnValue(true);
      (mockUserRepository.findById as jest.Mock).mockResolvedValue({
        id: dto.requesterUserId,
        rolesAssigned: ['ADMIN'],
      });
      (mockFolioRepository.findById as jest.Mock).mockResolvedValue(mockFolio);
      (mockStorageAdapter.exists as jest.Mock).mockResolvedValue(false);

      await expect(useCase.execute(dto)).rejects.toThrow('not available in storage');

      expect(mockStorageAdapter.retrieve).not.toHaveBeenCalled();
    });

    it('should handle storage retrieval errors gracefully', async () => {
      const dto: RecoverDocumentDTO = {
        folioId: 'folio-error',
        requesterUserId: 'admin-user-1',
      };

      const mockFolio = {
        id: dto.folioId,
        institutionalFolio: 'ITSON-ERR-2026',
        pdfStorageUrl: 's3://bucket/folio-error.pdf',
      };

      (mockRbacService.hasPermission as jest.Mock).mockReturnValue(true);
      (mockUserRepository.findById as jest.Mock).mockResolvedValue({
        id: dto.requesterUserId,
        rolesAssigned: ['ADMIN'],
      });
      (mockFolioRepository.findById as jest.Mock).mockResolvedValue(mockFolio);
      (mockStorageAdapter.exists as jest.Mock).mockResolvedValue(true);
      (mockStorageAdapter.retrieve as jest.Mock).mockRejectedValue(
        new Error('Storage connection failed'),
      );

      await expect(useCase.execute(dto)).rejects.toThrow('Could not retrieve PDF');
    });

    it('should include recovery reason in audit log', async () => {
      const dto: RecoverDocumentDTO = {
        folioId: 'folio-audit',
        requesterUserId: 'admin-user-1',
        reason: 'Audit investigation - Issue #12345',
      };

      const mockFolio = {
        id: dto.folioId,
        institutionalFolio: 'ITSON-AUD-2026',
        enrollmentId: 'E888',
        originalDataHash: 'hash-audit',
        rawPayloadData: {},
        pdfStorageUrl: 's3://bucket/folio-audit.pdf',
      };

      (mockRbacService.hasPermission as jest.Mock).mockReturnValue(true);
      (mockUserRepository.findById as jest.Mock).mockResolvedValue({
        id: dto.requesterUserId,
        rolesAssigned: ['ADMIN'],
      });
      (mockFolioRepository.findById as jest.Mock).mockResolvedValue(mockFolio);
      (mockStorageAdapter.exists as jest.Mock).mockResolvedValue(true);
      (mockStorageAdapter.retrieve as jest.Mock).mockResolvedValue(Buffer.from('pdf'));

      await useCase.execute(dto);

      expect(mockAuditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'RECUPERAR',
          affectedEntity: 'Documento_Folio',
          detailSnapshot: expect.objectContaining({
            institutionalFolio: 'ITSON-AUD-2026',
            recoveryReason: 'Audit investigation - Issue #12345',
          }),
        }),
      );
    });
  });
});
