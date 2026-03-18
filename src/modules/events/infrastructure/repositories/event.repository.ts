import { DataSource } from 'typeorm';

import { EventEntity } from '@/src/modules/events/infrastructure/entities/event.entity';
import { EventStatus } from '@/src/modules/events/domain/enums/event-status.enum';

export class EventRepository {
  constructor(private readonly dataSource: DataSource) {}

  async findById(id: string): Promise<EventEntity | null> {
    return this.dataSource.getRepository(EventEntity).findOne({
      where: { id },
      relations: ['template', 'creator', 'signerConsensus', 'emissionBatches'],
    });
  }

  async findAll(): Promise<EventEntity[]> {
    return this.dataSource.getRepository(EventEntity).find({
      relations: ['template', 'creator', 'signerConsensus', 'emissionBatches'],
    });
  }

  create(input: Partial<EventEntity>): EventEntity {
    return this.dataSource.getRepository(EventEntity).create(input);
  }

  async save(entity: EventEntity): Promise<EventEntity> {
    return this.dataSource.getRepository(EventEntity).save(entity);
  }

  async delete(id: string): Promise<void> {
    await this.dataSource.getRepository(EventEntity).delete(id);
  }

  async findByTemplateId(templateId: string): Promise<EventEntity[]> {
    return this.dataSource.getRepository(EventEntity).find({
      where: { templateId },
      relations: ['creator', 'signerConsensus'],
    });
  }

  async findByCreatorId(creatorId: string): Promise<EventEntity[]> {
    return this.dataSource.getRepository(EventEntity).find({
      where: { creatorId },
      relations: ['template', 'signerConsensus'],
    });
  }

  async findByStatus(status: string): Promise<EventEntity[]> {
    return this.dataSource.getRepository(EventEntity).find({
      where: { consensusStatus: status as EventStatus },
      relations: ['template', 'creator', 'signerConsensus'],
    });
  }
}
