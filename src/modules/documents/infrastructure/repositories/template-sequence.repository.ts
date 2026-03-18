import { DataSource } from 'typeorm';

import { TemplateSequenceEntity } from '@/src/modules/documents/infrastructure/entities/template-sequence.entity';

export class TemplateSequenceRepository {
  constructor(private readonly dataSource: DataSource) {}

  async reserveNextSequence(templateId: string, emissionYear: number): Promise<number> {
    return this.dataSource.transaction(async (manager) => {
      let sequence = await manager.findOne(TemplateSequenceEntity, {
        where: { templateId, emissionYear },
        lock: { mode: 'pessimistic_write' },
      });

      if (!sequence) {
        sequence = manager.create(TemplateSequenceEntity, {
          templateId,
          emissionYear,
          currentSequence: 0,
        });
      }

      sequence.currentSequence += 1;
      const saved = await manager.save(TemplateSequenceEntity, sequence);

      return saved.currentSequence;
    });
  }
}
