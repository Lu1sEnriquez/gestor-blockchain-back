import { UserRole } from '@/src/modules/users/domain/enums/user-role.enum';
import { RBACService } from '@/src/modules/users/domain/services/rbac.service';
import { UserEntity } from '@/src/modules/users/infrastructure/entities/user.entity';
import { UserRepository } from '@/src/modules/users/infrastructure/repositories/user.repository';

export interface CreateUserDTO {
  requesterUserId: string;
  fullName: string;
  institutionalEmail: string;
  rolesAssigned: UserRole[];
  officialPosition: string;
  signaturePngUrl: string;
}

export class CreateUserUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly rbacService: RBACService,
  ) {}

  async execute(dto: CreateUserDTO): Promise<UserEntity> {
    const requester = await this.userRepository.findById(dto.requesterUserId);
    if (!requester) {
      throw new Error(`Requester user with ID ${dto.requesterUserId} not found`);
    }

    const isAdmin = requester.rolesAssigned.some((role) =>
      this.rbacService.hasPermission(role, 'create_user'),
    );

    if (!isAdmin) {
      throw new Error(
        `User ${dto.requesterUserId} (${requester.rolesAssigned.join(',')}) lacks create_user permission`,
      );
    }

    const existing = await this.userRepository.findByEmail(dto.institutionalEmail);
    if (existing) {
      throw new Error(`User with email ${dto.institutionalEmail} already exists`);
    }

    return this.userRepository.createUserWithVault({
      fullName: dto.fullName,
      institutionalEmail: dto.institutionalEmail,
      rolesAssigned: dto.rolesAssigned,
      officialPosition: dto.officialPosition,
      signaturePngUrl: dto.signaturePngUrl,
    });
  }
}

export interface ListUsersDTO {
  requesterUserId: string;
  role?: UserRole;
}

export class ListUsersUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly rbacService: RBACService,
  ) {}

  async execute(dto: ListUsersDTO): Promise<UserEntity[]> {
    const requester = await this.userRepository.findById(dto.requesterUserId);
    if (!requester) {
      throw new Error(`Requester user with ID ${dto.requesterUserId} not found`);
    }

    const canList = requester.rolesAssigned.some((role) =>
      this.rbacService.hasPermission(role, 'list_users') ||
      this.rbacService.hasPermission(role, 'view_all_users'),
    );

    if (!canList) {
      throw new Error(
        `User ${dto.requesterUserId} (${requester.rolesAssigned.join(',')}) lacks list_users permission`,
      );
    }

    if (dto.role) {
      return this.userRepository.findByRole(dto.role);
    }

    return this.userRepository.findAll();
  }
}
