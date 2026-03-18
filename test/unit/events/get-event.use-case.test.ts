import { GetEventUseCase } from '@/src/modules/events/application/use-cases/event.use-cases';
import { EventStatus } from '@/src/modules/events/domain/enums/event-status.enum';
import { EventEntity } from '@/src/modules/events/infrastructure/entities/event.entity';
import { EventRepository } from '@/src/modules/events/infrastructure/repositories/event.repository';
import { UserRole } from '@/src/modules/users/domain/enums/user-role.enum';
import { RBACService } from '@/src/modules/users/domain/services/rbac.service';
import { UserEntity } from '@/src/modules/users/infrastructure/entities/user.entity';
import { UserRepository } from '@/src/modules/users/infrastructure/repositories/user.repository';

describe('GetEventUseCase', () => {
  let useCase: GetEventUseCase;
  let mockEventRepository: Partial<EventRepository>;
  let mockUserRepository: Partial<UserRepository>;

  beforeEach(() => {
    mockEventRepository = {
      findById: jest.fn(),
    };

    mockUserRepository = {
      findById: jest.fn(),
    };

    useCase = new GetEventUseCase(
      mockEventRepository as EventRepository,
      mockUserRepository as UserRepository,
      new RBACService(),
    );
  });

  it('returns event when requester is event owner', async () => {
    const event = buildEvent({ id: 'event-1', creatorId: 'creator-1' });
    const requester = buildUser({ id: 'creator-1', rolesAssigned: [UserRole.CREATOR] });

    (mockEventRepository.findById as jest.Mock).mockResolvedValue(event);
    (mockUserRepository.findById as jest.Mock).mockResolvedValue(requester);

    const result = await useCase.execute({
      eventId: event.id,
      requesterUserId: requester.id,
    });

    expect(result.id).toBe(event.id);
    expect(result.creatorId).toBe('creator-1');
  });

  it('returns event when requester has global view permission', async () => {
    const event = buildEvent({ id: 'event-2', creatorId: 'creator-1' });
    const requester = buildUser({ id: 'auditor-1', rolesAssigned: [UserRole.AUDITOR] });

    (mockEventRepository.findById as jest.Mock).mockResolvedValue(event);
    (mockUserRepository.findById as jest.Mock).mockResolvedValue(requester);

    const result = await useCase.execute({
      eventId: event.id,
      requesterUserId: requester.id,
    });

    expect(result.id).toBe(event.id);
  });

  it('throws when event does not exist', async () => {
    (mockEventRepository.findById as jest.Mock).mockResolvedValue(null);

    await expect(
      useCase.execute({ eventId: 'missing-event', requesterUserId: 'user-1' }),
    ).rejects.toThrow('not found');
  });

  it('throws when requester does not exist', async () => {
    const event = buildEvent({ id: 'event-3', creatorId: 'creator-1' });

    (mockEventRepository.findById as jest.Mock).mockResolvedValue(event);
    (mockUserRepository.findById as jest.Mock).mockResolvedValue(null);

    await expect(
      useCase.execute({ eventId: event.id, requesterUserId: 'missing-user' }),
    ).rejects.toThrow('not found');
  });

  it('throws when requester cannot access event', async () => {
    const event = buildEvent({ id: 'event-4', creatorId: 'creator-1' });
    const requester = buildUser({ id: 'creator-2', rolesAssigned: [UserRole.CREATOR] });

    (mockEventRepository.findById as jest.Mock).mockResolvedValue(event);
    (mockUserRepository.findById as jest.Mock).mockResolvedValue(requester);

    await expect(
      useCase.execute({ eventId: event.id, requesterUserId: requester.id }),
    ).rejects.toThrow('lacks view_event permission');
  });
});

function buildEvent(overrides: Partial<EventEntity>): EventEntity {
  return {
    id: 'event-default',
    eventName: 'Evento Default',
    templateId: 'template-1',
    creatorId: 'creator-default',
    consensusStatus: EventStatus.PENDING,
    web3Enabled: true,
    globalContextInjected: {},
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as EventEntity;
}

function buildUser(overrides: Partial<UserEntity>): UserEntity {
  return {
    id: 'user-default',
    fullName: 'Usuario Demo',
    institutionalEmail: 'usuario.demo@itson.edu.mx',
    rolesAssigned: [UserRole.CREATOR],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as UserEntity;
}
