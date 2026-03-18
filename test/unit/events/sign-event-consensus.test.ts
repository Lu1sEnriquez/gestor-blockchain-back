import { EventStatus } from '@/src/modules/events/domain/enums/event-status.enum';
import { UserRole } from '@/src/modules/users/domain/enums/user-role.enum';
import { RBACService } from '@/src/modules/users/domain/services/rbac.service';
import { EventStateService } from '@/src/modules/events/domain/services/event-state.service';
import { SignEventUseCase, SignEventDTO } from '@/src/modules/events/application/use-cases/event.use-cases';
import { ConsensusValidationService } from '@/src/modules/events/domain/services/consensus-validation.service';
import { EventRepository } from '@/src/modules/events/infrastructure/repositories/event.repository';
import { UserRepository } from '@/src/modules/users/infrastructure/repositories/user.repository';
import { SignerConsensusRepository } from '@/src/modules/events/infrastructure/repositories/signer-consensus.repository';

describe('SignEventUseCase with Consensus Validation - Integration Tests', () => {
  let useCase: SignEventUseCase;
  let mockEventRepository: Partial<EventRepository>;
  let mockUserRepository: Partial<UserRepository>;
  let mockSignerConsensusRepository: Partial<SignerConsensusRepository>;
  let consensusValidationService: ConsensusValidationService;
  let rbacService: RBACService;
  let stateService: EventStateService;

  beforeEach(() => {
    rbacService = new RBACService();
    stateService = new EventStateService();

    // Mock repositories
    mockEventRepository = {
      findById: jest.fn(),
      save: jest.fn(),
    };

    mockUserRepository = {
      findById: jest.fn(),
    };

    mockSignerConsensusRepository = {
      countByEventId: jest.fn(),
      countApprovedByEventId: jest.fn(),
      findByEventId: jest.fn(),
    };

    // Create service with mock repository
    consensusValidationService = new ConsensusValidationService(
      mockSignerConsensusRepository as SignerConsensusRepository,
    );

    // Create use case with all dependencies
    useCase = new SignEventUseCase(
      mockEventRepository as EventRepository,
      mockUserRepository as UserRepository,
      rbacService,
      stateService,
      consensusValidationService,
    );
  });

  describe('SignEvent with complete consensus', () => {
    it('should allow AUTHORIZED → SIGNED transition when consensus is complete', async () => {
      const eventId = 'event-1';
      const signerId = 'signer-1';
      const dto: SignEventDTO = {
        eventId,
        signerUserId: signerId,
        documentHashes: ['hash1', 'hash2'],
      };

      // Setup mock event
      const mockEvent = {
        id: eventId,
        eventName: 'Test Event',
        templateId: 'template-1',
        creatorId: 'creator-1',
        consensusStatus: EventStatus.AUTHORIZED,
        web3Enabled: true,
        globalContextInjected: {},
        save: jest.fn(),
      };

      // Setup mock signer
      const mockSigner = {
        id: signerId,
        email: 'signer@example.com',
        rolesAssigned: [UserRole.SIGNER],
      };

      // Setup mocks
      (mockEventRepository.findById as jest.Mock).mockResolvedValue(mockEvent);
      (mockUserRepository.findById as jest.Mock).mockResolvedValue(mockSigner);
      (mockSignerConsensusRepository.countByEventId as jest.Mock).mockResolvedValue(2);
      (mockSignerConsensusRepository.countApprovedByEventId as jest.Mock).mockResolvedValue(2); // All approved
      (mockEventRepository.save as jest.Mock).mockResolvedValue({
        ...mockEvent,
        consensusStatus: EventStatus.SIGNED,
      });

      // Execute
      const result = await useCase.execute(dto);

      // Verify
      expect(result.consensusStatus).toBe(EventStatus.SIGNED);
      expect(mockEventRepository.save).toHaveBeenCalledWith(expect.objectContaining({
        consensusStatus: EventStatus.SIGNED,
      }));
    });
  });

  describe('SignEvent with incomplete consensus', () => {
    it('should reject AUTHORIZED → SIGNED when consensus is incomplete', async () => {
      const eventId = 'event-1';
      const signerId = 'signer-1';
      const dto: SignEventDTO = {
        eventId,
        signerUserId: signerId,
        documentHashes: ['hash1'],
      };

      const mockEvent = {
        id: eventId,
        eventName: 'Test Event',
        templateId: 'template-1',
        consensusStatus: EventStatus.AUTHORIZED,
      };

      const mockSigner = {
        id: signerId,
        email: 'signer@example.com',
        rolesAssigned: [UserRole.SIGNER],
      };

      (mockEventRepository.findById as jest.Mock).mockResolvedValue(mockEvent);
      (mockUserRepository.findById as jest.Mock).mockResolvedValue(mockSigner);
      (mockSignerConsensusRepository.countByEventId as jest.Mock).mockResolvedValue(3);
      (mockSignerConsensusRepository.countApprovedByEventId as jest.Mock).mockResolvedValue(2); // Only 2 of 3 approved

      // Execute and expect error
      await expect(useCase.execute(dto)).rejects.toThrow(
        'Cannot sign event: incomplete consensus (2/3 signers approved)',
      );

      // Verify save was NOT called
      expect(mockEventRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('SignEvent with no required signers', () => {
    it('should allow SIGNED transition when there are no required signers (automatic consensus)', async () => {
      const eventId = 'event-no-signers';
      const signerId = 'signer-1';
      const dto: SignEventDTO = {
        eventId,
        signerUserId: signerId,
        documentHashes: [],
      };

      const mockEvent = {
        id: eventId,
        eventName: 'Simple Event',
        templateId: 'template-1',
        consensusStatus: EventStatus.AUTHORIZED,
      };

      const mockSigner = {
        id: signerId,
        rolesAssigned: [UserRole.SIGNER],
      };

      (mockEventRepository.findById as jest.Mock).mockResolvedValue(mockEvent);
      (mockUserRepository.findById as jest.Mock).mockResolvedValue(mockSigner);
      (mockSignerConsensusRepository.countByEventId as jest.Mock).mockResolvedValue(0); // No signers required
      (mockEventRepository.save as jest.Mock).mockResolvedValue({
        ...mockEvent,
        consensusStatus: EventStatus.SIGNED,
      });

      const result = await useCase.execute(dto);

      expect(result.consensusStatus).toBe(EventStatus.SIGNED);
      expect(mockEventRepository.save).toHaveBeenCalled();
    });
  });

  describe('SignEvent with RBAC validation', () => {
    it('should reject signing when user lacks sign_event permission', async () => {
      const eventId = 'event-1';
      const userId = 'creator-1';
      const dto: SignEventDTO = {
        eventId,
        signerUserId: userId,
        documentHashes: [],
      };

      const mockEvent = {
        id: eventId,
        consensusStatus: EventStatus.AUTHORIZED,
      };

      const mockUser = {
        id: userId,
        rolesAssigned: [UserRole.CREATOR],
      };

      (mockEventRepository.findById as jest.Mock).mockResolvedValue(mockEvent);
      (mockUserRepository.findById as jest.Mock).mockResolvedValue(mockUser);

      await expect(useCase.execute(dto)).rejects.toThrow('lacks sign_event permission');
      expect(mockEventRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('SignEvent with invalid state transition', () => {
    it('should reject signing when event is not in AUTHORIZED state', async () => {
      const eventId = 'event-1';
      const signerId = 'signer-1';
      const dto: SignEventDTO = {
        eventId,
        signerUserId: signerId,
        documentHashes: [],
      };

      const mockEvent = {
        id: eventId,
        consensusStatus: EventStatus.PENDING, // Wrong state
      };

      const mockSigner = {
        id: signerId,
        rolesAssigned: [UserRole.SIGNER],
      };

      (mockEventRepository.findById as jest.Mock).mockResolvedValue(mockEvent);
      (mockUserRepository.findById as jest.Mock).mockResolvedValue(mockSigner);

      await expect(useCase.execute(dto)).rejects.toThrow('Cannot transition');
      expect(mockEventRepository.save).not.toHaveBeenCalled();
    });
  });
});
