import { DataSource } from 'typeorm';

import { AuditAction } from '@/src/modules/audits/domain/enums/audit-action.enum';
import { AuditLogEntity } from '@/src/modules/audits/infrastructure/entities/audit-log.entity';

export interface ListAuditFilters {
  userId?: string;
  action?: AuditAction;
  affectedEntity?: string;
  limit?: number;
}

export class AuditQueryRepository {
  constructor(private readonly dataSource: DataSource) {}

  async list(filters: ListAuditFilters): Promise<AuditLogEntity[]> {
    const query = this.dataSource
      .getRepository(AuditLogEntity)
      .createQueryBuilder('audit')
      .orderBy('audit.createdAt', 'DESC');

    if (filters.userId) {
      query.andWhere('audit.userId = :userId', { userId: filters.userId });
    }

    if (filters.action) {
      query.andWhere('audit.action = :action', { action: filters.action });
    }

    if (filters.affectedEntity) {
      query.andWhere('audit.affectedEntity = :affectedEntity', {
        affectedEntity: filters.affectedEntity,
      });
    }

    query.take(filters.limit ?? 100);

    return query.getMany();
  }
}
