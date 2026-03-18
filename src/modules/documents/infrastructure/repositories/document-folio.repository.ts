import { DataSource } from 'typeorm';

import { DocumentFolioEntity } from '@/src/modules/documents/infrastructure/entities/document-folio.entity';

export class DocumentFolioRepository {
  constructor(private readonly dataSource: DataSource) {}

  create(input: Partial<DocumentFolioEntity>): DocumentFolioEntity {
    return this.dataSource.getRepository(DocumentFolioEntity).create(input);
  }

  async findById(id: string): Promise<DocumentFolioEntity | null> {
    return this.dataSource.getRepository(DocumentFolioEntity).findOne({
      where: { id },
      relations: { batch: true },
    });
  }

  async saveMany(entities: DocumentFolioEntity[]): Promise<DocumentFolioEntity[]> {
    return this.dataSource.getRepository(DocumentFolioEntity).save(entities);
  }

  async save(entity: DocumentFolioEntity): Promise<DocumentFolioEntity> {
    return this.dataSource.getRepository(DocumentFolioEntity).save(entity);
  }

  async findByOriginalDataHash(originalDataHash: string): Promise<DocumentFolioEntity | null> {
    return this.dataSource.getRepository(DocumentFolioEntity).findOne({
      where: { originalDataHash },
      relations: { batch: true },
    });
  }

  async findByInstitutionalFolio(institutionalFolio: string): Promise<DocumentFolioEntity | null> {
    return this.dataSource.getRepository(DocumentFolioEntity).findOne({
      where: { institutionalFolio },
      relations: { batch: true },
    });
  }

  async listByBatchId(batchId: string): Promise<DocumentFolioEntity[]> {
    return this.dataSource.getRepository(DocumentFolioEntity).find({
      where: { batchId },
      order: { createdAt: 'ASC', id: 'ASC' },
    });
  }
}
