import { AuditAction } from '@/src/modules/audits/domain/enums/audit-action.enum';
import {
  AuditQueryRepository,
  ListAuditFilters,
} from '@/src/modules/audits/infrastructure/repositories/audit-query.repository';
import { UserRole } from '@/src/modules/users/domain/enums/user-role.enum';
import { UserRepository } from '@/src/modules/users/infrastructure/repositories/user.repository';

export interface ListAuditsDTO extends ListAuditFilters {
  requesterUserId: string;
}

export class ListAuditsUseCase {
  constructor(
    private readonly auditQueryRepository: AuditQueryRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async execute(dto: ListAuditsDTO) {
    const requester = await this.userRepository.findById(dto.requesterUserId);
    if (!requester) {
      throw new Error(`Requester user with ID ${dto.requesterUserId} not found`);
    }

    const canViewAudits = requester.rolesAssigned.some((role) =>
      [UserRole.ADMIN, UserRole.AUDITOR].includes(role),
    );

    if (!canViewAudits) {
      throw new Error(
        `User ${dto.requesterUserId} (${requester.rolesAssigned.join(',')}) lacks audit_logs permission`,
      );
    }

    return this.auditQueryRepository.list({
      userId: dto.userId,
      action: dto.action as AuditAction | undefined,
      affectedEntity: dto.affectedEntity,
      limit: dto.limit,
    });
  }
}
