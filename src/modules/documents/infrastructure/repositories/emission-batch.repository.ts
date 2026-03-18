import { DataSource } from 'typeorm';

import { EmissionBatchEntity } from '@/src/modules/documents/infrastructure/entities/emission-batch.entity';

export class EmissionBatchRepository {
  constructor(private readonly dataSource: DataSource) {}

  create(input: Partial<EmissionBatchEntity>): EmissionBatchEntity {
    return this.dataSource.getRepository(EmissionBatchEntity).create(input);
  }

  async save(entity: EmissionBatchEntity): Promise<EmissionBatchEntity> {
    return this.dataSource.getRepository(EmissionBatchEntity).save(entity);
  }
}
