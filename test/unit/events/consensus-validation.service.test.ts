import { ConsensusValidationService } from '@/src/modules/events/domain/services/consensus-validation.service';
import { SignerConsensusRepository } from '@/src/modules/events/infrastructure/repositories/signer-consensus.repository';

describe('ConsensusValidationService - Unit Tests', () => {
  let service: ConsensusValidationService;
  let mockRepository: Partial<SignerConsensusRepository>;

  beforeEach(() => {
    mockRepository = {
      countByEventId: jest.fn(),
      countApprovedByEventId: jest.fn(),
      findByEventId: jest.fn(),
    };

    service = new ConsensusValidationService(mockRepository as SignerConsensusRepository);
  });

  describe('hasCompleteConsensus', () => {
    it('should return true when all signers have approved', async () => {
      const eventId = 'event-1';

      (mockRepository.countByEventId as jest.Mock).mockResolvedValue(3);
      (mockRepository.countApprovedByEventId as jest.Mock).mockResolvedValue(3);

      const result = await service.hasCompleteConsensus(eventId);

      expect(result).toBe(true);
      expect(mockRepository.countByEventId).toHaveBeenCalledWith(eventId);
      expect(mockRepository.countApprovedByEventId).toHaveBeenCalledWith(eventId);
    });

    it('should return false when some signers have not approved', async () => {
      const eventId = 'event-1';

      (mockRepository.countByEventId as jest.Mock).mockResolvedValue(3);
      (mockRepository.countApprovedByEventId as jest.Mock).mockResolvedValue(2);

      const result = await service.hasCompleteConsensus(eventId);

      expect(result).toBe(false);
    });

    it('should return true when there are no required signers (automatic consensus)', async () => {
      const eventId = 'event-no-signers';

      (mockRepository.countByEventId as jest.Mock).mockResolvedValue(0);

      const result = await service.hasCompleteConsensus(eventId);

      expect(result).toBe(true);
      // countApprovedByEventId should NOT be called when total is 0
      expect(mockRepository.countApprovedByEventId).not.toHaveBeenCalled();
    });

    it('should return false when no signers have approved but signers are required', async () => {
      const eventId = 'event-pending-approval';

      (mockRepository.countByEventId as jest.Mock).mockResolvedValue(5);
      (mockRepository.countApprovedByEventId as jest.Mock).mockResolvedValue(0);

      const result = await service.hasCompleteConsensus(eventId);

      expect(result).toBe(false);
    });
  });

  describe('getConsensusStatus', () => {
    it('should return consensus status as { approved, total }', async () => {
      const eventId = 'event-1';

      (mockRepository.countByEventId as jest.Mock).mockResolvedValue(4);
      (mockRepository.countApprovedByEventId as jest.Mock).mockResolvedValue(2);

      const result = await service.getConsensusStatus(eventId);

      expect(result).toEqual({ approved: 2, total: 4 });
    });

    it('should return { approved: 0, total: 0 } for event with no signers', async () => {
      const eventId = 'event-no-signers';

      (mockRepository.countByEventId as jest.Mock).mockResolvedValue(0);
      (mockRepository.countApprovedByEventId as jest.Mock).mockResolvedValue(0);

      const result = await service.getConsensusStatus(eventId);

      expect(result).toEqual({ approved: 0, total: 0 });
    });

    it('should return { approved: total, total } when all signers approved', async () => {
      const eventId = 'event-approved';

      (mockRepository.countByEventId as jest.Mock).mockResolvedValue(3);
      (mockRepository.countApprovedByEventId as jest.Mock).mockResolvedValue(3);

      const result = await service.getConsensusStatus(eventId);

      expect(result).toEqual({ approved: 3, total: 3 });
    });
  });

  describe('getPendingSigners', () => {
    it('should return list of vault IDs that have not approved', async () => {
      const eventId = 'event-1';
      const mockConsensuses = [
        {
          id: '1',
          eventId,
          signatureVaultId: 'vault-1',
          approved: true,
        },
        {
          id: '2',
          eventId,
          signatureVaultId: 'vault-2',
          approved: false,
        },
        {
          id: '3',
          eventId,
          signatureVaultId: 'vault-3',
          approved: null,
        },
      ];

      (mockRepository.findByEventId as jest.Mock).mockResolvedValue(mockConsensuses);

      const result = await service.getPendingSigners(eventId);

      expect(result).toEqual(['vault-2', 'vault-3']);
      expect(mockRepository.findByEventId).toHaveBeenCalledWith(eventId);
    });

    it('should return empty list when all signers have approved', async () => {
      const eventId = 'event-approved';
      const mockConsensuses = [
        {
          id: '1',
          eventId,
          signatureVaultId: 'vault-1',
          approved: true,
        },
        {
          id: '2',
          eventId,
          signatureVaultId: 'vault-2',
          approved: true,
        },
      ];

      (mockRepository.findByEventId as jest.Mock).mockResolvedValue(mockConsensuses);

      const result = await service.getPendingSigners(eventId);

      expect(result).toEqual([]);
    });

    it('should return all vault IDs when no signers have approved', async () => {
      const eventId = 'event-pending';
      const mockConsensuses = [
        {
          id: '1',
          eventId,
          signatureVaultId: 'vault-1',
          approved: false,
        },
        {
          id: '2',
          eventId,
          signatureVaultId: 'vault-2',
          approved: false,
        },
      ];

      (mockRepository.findByEventId as jest.Mock).mockResolvedValue(mockConsensuses);

      const result = await service.getPendingSigners(eventId);

      expect(result).toEqual(['vault-1', 'vault-2']);
    });

    it('should return empty list when event has no signers', async () => {
      const eventId = 'event-no-signers';

      (mockRepository.findByEventId as jest.Mock).mockResolvedValue([]);

      const result = await service.getPendingSigners(eventId);

      expect(result).toEqual([]);
    });
  });
});
