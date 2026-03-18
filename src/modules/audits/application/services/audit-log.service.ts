import { AuditAction } from '@/src/modules/audits/domain/enums/audit-action.enum';

export type AuditLogInput = {
  userId: string;
  action: AuditAction;
  affectedEntity: string;
  affectedEntityId: string;
  detailSnapshot: Record<string, unknown>;
  sourceIp?: string | null;
};

export interface AuditLogRepositoryPort {
  create(input: AuditLogInput): Promise<void>;
}

export class AuditLogService {
  constructor(private readonly repository: AuditLogRepositoryPort) {}

  async log(input: AuditLogInput): Promise<void> {
    await this.repository.create(input);
  }
}
