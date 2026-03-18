import { DataSource } from 'typeorm';

import { DocumentTemplateEntity } from '@/src/modules/templates/infrastructure/entities/document-template.entity';

export class DocumentTemplateRepository {
  constructor(private readonly dataSource: DataSource) {}

  findAll(): Promise<DocumentTemplateEntity[]> {
    return this.dataSource.getRepository(DocumentTemplateEntity).find({
      relations: ['creator'],
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<DocumentTemplateEntity | null> {
    return this.dataSource.getRepository(DocumentTemplateEntity).findOne({
      where: { id },
      relations: ['creator'],
    });
  }

  async findByFolioPrefix(folioPrefix: string): Promise<DocumentTemplateEntity | null> {
    return this.dataSource.getRepository(DocumentTemplateEntity).findOne({
      where: { folioPrefix },
    });
  }

  create(input: Partial<DocumentTemplateEntity>): DocumentTemplateEntity {
    return this.dataSource.getRepository(DocumentTemplateEntity).create(input);
  }

  save(entity: DocumentTemplateEntity): Promise<DocumentTemplateEntity> {
    return this.dataSource.getRepository(DocumentTemplateEntity).save(entity);
  }
}
