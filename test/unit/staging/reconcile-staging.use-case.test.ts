import { EventStatus } from '@/src/modules/events/domain/enums/event-status.enum';
import { EventStateService } from '@/src/modules/events/domain/services/event-state.service';
import { EventEntity } from '@/src/modules/events/infrastructure/entities/event.entity';
import { RBACService } from '@/src/modules/users/domain/services/rbac.service';
import { UserRole } from '@/src/modules/users/domain/enums/user-role.enum';
import { UserEntity } from '@/src/modules/users/infrastructure/entities/user.entity';
import { ReconcileStagingUseCase } from '@/src/modules/staging/application/use-cases/reconcile-staging.use-case';

class InMemoryEventRepository {
  constructor(private readonly event: EventEntity | null) {}

  async findById(): Promise<EventEntity | null> {
    return this.event;
  }
}

class InMemoryUserRepository {
  constructor(private readonly user: UserEntity | null) {}

  async findById(): Promise<UserEntity | null> {
    return this.user;
  }
}

function buildEvent(status: EventStatus): EventEntity {
  return {
    id: 'event-1',
    eventName: 'Evento demo',
    templateId: 'template-1',
    creatorId: 'creator-1',
    consensusStatus: status,
    web3Enabled: true,
    globalContextInjected: {},
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as EventEntity;
}

function buildUser(role: UserRole): UserEntity {
  return {
    id: 'admin-1',
    fullName: 'Admin',
    institutionalEmail: 'admin@itson.mx',
    rolesAssigned: [role],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as UserEntity;
}

describe('ReconcileStagingUseCase', () => {
  it('reconciles rows by enrollment when all declared zones are present', async () => {
    const useCase = new ReconcileStagingUseCase(
      new InMemoryEventRepository(buildEvent(EventStatus.SIGNED)) as unknown as never,
      new InMemoryUserRepository(buildUser(UserRole.ADMIN)) as unknown as never,
      new RBACService(),
      new EventStateService(),
    );

    const result = await useCase.execute({
      eventId: 'event-1',
      operatorUserId: 'admin-1',
      declaredZones: ['norte', 'sur'],
      zipBundles: [
        { zone: 'norte', zipFileName: 'norte-1.zip' },
        { zone: 'sur', zipFileName: 'sur-1.zip' },
      ],
      rows: [
        { enrollmentId: '243410', zone: 'norte' },
        { enrollmentId: '243410', zone: 'sur' },
      ],
    });

    expect(result.reconciledCount).toBe(1);
    expect(result.errorCount).toBe(0);
    expect(result.zonesDeclared).toEqual(['NORTE', 'SUR']);
  });

  it('returns errors when enrollment has missing zones', async () => {
    const useCase = new ReconcileStagingUseCase(
      new InMemoryEventRepository(buildEvent(EventStatus.SIGNED)) as unknown as never,
      new InMemoryUserRepository(buildUser(UserRole.ADMIN)) as unknown as never,
      new RBACService(),
      new EventStateService(),
    );

    const result = await useCase.execute({
      eventId: 'event-1',
      operatorUserId: 'admin-1',
      declaredZones: ['norte', 'sur'],
      zipBundles: [
        { zone: 'norte', zipFileName: 'norte-1.zip' },
        { zone: 'sur', zipFileName: 'sur-1.zip' },
      ],
      rows: [{ enrollmentId: '243410', zone: 'norte' }],
    });

    expect(result.reconciledCount).toBe(0);
    expect(result.errorCount).toBe(1);
    expect(result.errors[0].missingZones).toEqual(['SUR']);
  });

  it('requires SIGNED event status for CU-05', async () => {
    const useCase = new ReconcileStagingUseCase(
      new InMemoryEventRepository(buildEvent(EventStatus.AUTHORIZED)) as unknown as never,
      new InMemoryUserRepository(buildUser(UserRole.ADMIN)) as unknown as never,
      new RBACService(),
      new EventStateService(),
    );

    await expect(
      useCase.execute({
        eventId: 'event-1',
        operatorUserId: 'admin-1',
        declaredZones: ['norte'],
        zipBundles: [{ zone: 'norte', zipFileName: 'norte-1.zip' }],
        rows: [{ enrollmentId: '243410', zone: 'norte' }],
      }),
    ).rejects.toThrow('required SIGNED');
  });
});
