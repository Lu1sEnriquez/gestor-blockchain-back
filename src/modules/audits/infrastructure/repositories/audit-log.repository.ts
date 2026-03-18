import { DataSource } from 'typeorm';

import {
  AuditLogInput,
  AuditLogRepositoryPort,
} from '@/src/modules/audits/application/services/audit-log.service';
import { AuditLogEntity } from '@/src/modules/audits/infrastructure/entities/audit-log.entity';

export class TypeOrmAuditLogRepository implements AuditLogRepositoryPort {
  constructor(private readonly dataSource: DataSource) {}

  async create(input: AuditLogInput): Promise<void> {
    const entity = this.dataSource.getRepository(AuditLogEntity).create({
      userId: input.userId,
      action: input.action,
      affectedEntity: input.affectedEntity,
      affectedEntityId: input.affectedEntityId,
      detailSnapshot: input.detailSnapshot,
      sourceIp: input.sourceIp ?? null,
    });

    await this.dataSource.getRepository(AuditLogEntity).save(entity);
  }
}
