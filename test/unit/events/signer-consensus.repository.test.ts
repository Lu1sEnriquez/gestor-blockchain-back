import { DataSource } from 'typeorm';
import { SignerConsensusRepository } from '@/src/modules/events/infrastructure/repositories/signer-consensus.repository';
import { SignerConsensusEntity } from '@/src/modules/events/infrastructure/entities/signer-consensus.entity';

describe('SignerConsensusRepository - Unit Tests', () => {
  let repository: SignerConsensusRepository;
  let mockRepository: Record<string, jest.Mock>;

  beforeEach(() => {
    mockRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    };

    const mockDataSource = {
      getRepository: jest.fn(() => mockRepository),
    } as unknown as DataSource;

    repository = new SignerConsensusRepository(mockDataSource);
  });

  describe('findById', () => {
    it('should find a signer consensus by ID', async () => {
      const consensusId = '123e4567-e89b-12d3-a456-426614174000';
      const mockConsensus = {
        id: consensusId,
        eventId: 'event-1',
        signatureVaultId: 'vault-1',
        approved: true,
        signedAt: new Date(),
      };

      mockRepository.findOne.mockResolvedValue(mockConsensus);

      const result = await repository.findById(consensusId);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: consensusId },
        relations: ['event', 'signatureVault'],
      });
      expect(result).toEqual(mockConsensus);
    });

    it('should return null if signer consensus not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await repository.findById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('findByEventId', () => {
    it('should find all signer consensuses for an event', async () => {
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
      ];

      mockRepository.find.mockResolvedValue(mockConsensuses);

      const result = await repository.findByEventId(eventId);

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { eventId },
        relations: ['event', 'signatureVault'],
      });
      expect(result).toHaveLength(2);
      expect(result).toEqual(mockConsensuses);
    });

    it('should return empty array if no consensuses found', async () => {
      mockRepository.find.mockResolvedValue([]);

      const result = await repository.findByEventId('non-existent-event');

      expect(result).toEqual([]);
    });
  });

  describe('findApprovedByEventId', () => {
    it('should find only approved signer consensuses', async () => {
      const eventId = 'event-1';
      const mockApproved = [
        {
          id: '1',
          eventId,
          signatureVaultId: 'vault-1',
          approved: true,
          signedAt: new Date(),
        },
      ];

      mockRepository.find.mockResolvedValue(mockApproved);

      const result = await repository.findApprovedByEventId(eventId);

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: {
          eventId,
          approved: true,
        },
        relations: ['signatureVault'],
      });
      expect(result).toHaveLength(1);
      expect(result[0].approved).toBe(true);
    });
  });

  describe('countByEventId', () => {
    it('should count total signer consensuses for an event', async () => {
      const eventId = 'event-1';
      mockRepository.count.mockResolvedValue(3);

      const result = await repository.countByEventId(eventId);

      expect(mockRepository.count).toHaveBeenCalledWith({
        where: { eventId },
      });
      expect(result).toBe(3);
    });

    it('should return 0 if no consensuses exist', async () => {
      mockRepository.count.mockResolvedValue(0);

      const result = await repository.countByEventId('non-existent-event');

      expect(result).toBe(0);
    });
  });

  describe('countApprovedByEventId', () => {
    it('should count approved signer consensuses for an event', async () => {
      const eventId = 'event-1';
      mockRepository.count.mockResolvedValue(2);

      const result = await repository.countApprovedByEventId(eventId);

      expect(mockRepository.count).toHaveBeenCalledWith({
        where: {
          eventId,
          approved: true,
        },
      });
      expect(result).toBe(2);
    });

    it('should return 0 if no approved consensuses exist', async () => {
      mockRepository.count.mockResolvedValue(0);

      const result = await repository.countApprovedByEventId('event-with-no-approvers');

      expect(result).toBe(0);
    });
  });

  describe('create and save', () => {
    it('should create a new signer consensus entity', () => {
      const input = {
        eventId: 'event-1',
        signatureVaultId: 'vault-1',
        approved: false,
      };

      const mockEntity = { id: '123', ...input };
      mockRepository.create.mockReturnValue(mockEntity);

      const result = repository.create(input);

      expect(mockRepository.create).toHaveBeenCalledWith(input);
      expect(result).toEqual(mockEntity);
    });

    it('should save a signer consensus entity', async () => {
      const entity = {
        id: '123',
        eventId: 'event-1',
        signatureVaultId: 'vault-1',
        approved: true,
        signedAt: new Date(),
      } as unknown as SignerConsensusEntity;

      mockRepository.save.mockResolvedValue(entity);

      const result = await repository.save(entity);

      expect(mockRepository.save).toHaveBeenCalledWith(entity);
      expect(result).toEqual(entity);
    });
  });

  describe('delete', () => {
    it('should delete a signer consensus by ID', async () => {
      const consensusId = '123';
      mockRepository.delete.mockResolvedValue({ affected: 1 });

      await repository.delete(consensusId);

      expect(mockRepository.delete).toHaveBeenCalledWith(consensusId);
    });
  });

  describe('findByEventIdAndVaultId', () => {
    it('should find signer consensus by event and vault IDs', async () => {
      const eventId = 'event-1';
      const vaultId = 'vault-1';
      const mockConsensus = {
        id: '123',
        eventId,
        signatureVaultId: vaultId,
        approved: true,
      };

      mockRepository.findOne.mockResolvedValue(mockConsensus);

      const result = await repository.findByEventIdAndVaultId(eventId, vaultId);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { eventId, signatureVaultId: vaultId },
        relations: ['event', 'signatureVault'],
      });
      expect(result).toEqual(mockConsensus);
    });
  });
});
