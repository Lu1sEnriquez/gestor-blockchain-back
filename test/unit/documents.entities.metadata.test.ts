import 'reflect-metadata';

import { getMetadataArgsStorage } from 'typeorm';

import { DocumentFolioEntity } from '@/src/modules/documents/infrastructure/entities/document-folio.entity';
import { TemplateSequenceEntity } from '@/src/modules/documents/infrastructure/entities/template-sequence.entity';

const metadataStorage = getMetadataArgsStorage();

describe('Document entities metadata', () => {
  it('should define unique institutionalFolio in DocumentFolioEntity', () => {
    const uniqueDefinition = metadataStorage.uniques.find(
      (unique) =>
        unique.target === DocumentFolioEntity &&
        Array.isArray(unique.columns) &&
        unique.columns.includes('institutionalFolio'),
    );

    expect(uniqueDefinition).toBeDefined();
  });

  it('should define composite unique for templateId + emissionYear in TemplateSequenceEntity', () => {
    const compositeUnique = metadataStorage.uniques.find(
      (unique) =>
        unique.target === TemplateSequenceEntity &&
        Array.isArray(unique.columns) &&
        unique.columns.includes('templateId') &&
        unique.columns.includes('emissionYear'),
    );

    expect(compositeUnique).toBeDefined();
  });
});
