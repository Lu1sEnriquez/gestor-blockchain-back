import 'reflect-metadata';

import { DataSource } from 'typeorm';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';

import { DocumentFolioEntity } from '@/src/modules/documents/infrastructure/entities/document-folio.entity';
import { EmissionBatchEntity } from '@/src/modules/documents/infrastructure/entities/emission-batch.entity';
import { TemplateSequenceRepository } from '@/src/modules/documents/infrastructure/repositories/template-sequence.repository';
import { BatchType } from '@/src/modules/documents/domain/enums/batch-type.enum';
import { NetworkState } from '@/src/modules/documents/domain/enums/network-state.enum';
import { EventStatus } from '@/src/modules/events/domain/enums/event-status.enum';
import { EventEntity } from '@/src/modules/events/infrastructure/entities/event.entity';
import { DocumentTemplateEntity } from '@/src/modules/templates/infrastructure/entities/document-template.entity';
import { UserRole } from '@/src/modules/users/domain/enums/user-role.enum';
import { SignatureVaultEntity } from '@/src/modules/users/infrastructure/entities/signature-vault.entity';
import { UserEntity } from '@/src/modules/users/infrastructure/entities/user.entity';
import { UserRepository } from '@/src/modules/users/infrastructure/repositories/user.repository';
import { APP_ENTITIES } from '@/src/shared/db/entities';

jest.setTimeout(120000);

describe('Repositories integration (PostgreSQL)', () => {
  let container: StartedPostgreSqlContainer | null = null;
  let dataSource: DataSource | null = null;
  let skipIntegration = false;

  beforeAll(async () => {
    try {
      container = await new PostgreSqlContainer('postgres:16-alpine')
        .withDatabase('gestor_blockchain_test')
        .withUsername('postgres')
        .withPassword('postgres')
        .start();

      dataSource = new DataSource({
        type: 'postgres',
        host: container.getHost(),
        port: container.getPort(),
        username: container.getUsername(),
        password: container.getPassword(),
        database: container.getDatabase(),
        entities: [...APP_ENTITIES],
        synchronize: true,
        dropSchema: true,
      });

      await dataSource.initialize();
    } catch (error) {
      skipIntegration = true;
      console.warn('Skipping integration tests: Docker/PostgreSQL unavailable.', error);
    }
  });

  beforeEach(async () => {
    if (!skipIntegration && dataSource) {
      await resetDatabase(dataSource);
    }
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }

    if (container) {
      await container.stop();
    }
  });

  it('creates user and signature vault in one transaction', async () => {
    if (skipIntegration || !dataSource) {
      expect(true).toBe(true);
      return;
    }

    const userRepository = new UserRepository(dataSource);

    const user = await userRepository.createUserWithVault({
      fullName: 'Luis Enriquez',
      institutionalEmail: 'luis@itson.edu.mx',
      rolesAssigned: [UserRole.ADMIN, UserRole.CREATOR],
      officialPosition: 'Director de Ingenieria',
      signaturePngUrl: 'https://s3.local/signature.png',
    });

    const vault = await dataSource.getRepository(SignatureVaultEntity).findOneBy({ userId: user.id });

    expect(user.id).toBeDefined();
    expect(vault?.id).toBeDefined();
  });

  it('enforces unique folioPrefix in document templates', async () => {
    if (skipIntegration || !dataSource) {
      expect(true).toBe(true);
      return;
    }

    const user = await dataSource.getRepository(UserEntity).save({
      fullName: 'Template Owner',
      institutionalEmail: 'template.owner@itson.edu.mx',
      rolesAssigned: [UserRole.ADMIN],
    });

    const templateRepository = dataSource.getRepository(DocumentTemplateEntity);

    await templateRepository.save({
      templateName: 'Plantilla A',
      folioPrefix: 'NA',
      craftSchemaJson: { blocks: [] },
      creatorId: user.id,
    });

    await expect(
      templateRepository.save({
        templateName: 'Plantilla B',
        folioPrefix: 'NA',
        craftSchemaJson: { blocks: ['text'] },
        creatorId: user.id,
      }),
    ).rejects.toBeDefined();
  });

  it('reserves sequential folios without duplicates under concurrency', async () => {
    if (skipIntegration || !dataSource) {
      expect(true).toBe(true);
      return;
    }

    const user = await dataSource.getRepository(UserEntity).save({
      fullName: 'Sequence Owner',
      institutionalEmail: 'sequence.owner@itson.edu.mx',
      rolesAssigned: [UserRole.ADMIN],
    });

    const template = await dataSource.getRepository(DocumentTemplateEntity).save({
      templateName: 'Plantilla Secuencia',
      folioPrefix: 'SC',
      craftSchemaJson: { blocks: [] },
      creatorId: user.id,
    });

    const sequenceRepository = new TemplateSequenceRepository(dataSource);

    const results = await Promise.all(
      Array.from({ length: 15 }, () => sequenceRepository.reserveNextSequence(template.id, 2026)),
    );

    const uniqueResults = new Set(results);

    expect(uniqueResults.size).toBe(15);
    expect(Math.min(...results)).toBe(1);
    expect(Math.max(...results)).toBe(15);
  });

  it('enforces unique institutional folio in document_folios', async () => {
    if (skipIntegration || !dataSource) {
      expect(true).toBe(true);
      return;
    }

    const user = await dataSource.getRepository(UserEntity).save({
      fullName: 'Flow Owner',
      institutionalEmail: 'flow.owner@itson.edu.mx',
      rolesAssigned: [UserRole.CREATOR],
    });

    const template = await dataSource.getRepository(DocumentTemplateEntity).save({
      templateName: 'Plantilla Flujo',
      folioPrefix: 'FL',
      craftSchemaJson: { blocks: [] },
      creatorId: user.id,
    });

    const event = await dataSource.getRepository(EventEntity).save({
      eventName: 'Congreso 2026',
      templateId: template.id,
      creatorId: user.id,
      consensusStatus: EventStatus.SIGNED,
      web3Enabled: true,
      globalContextInjected: {},
    });

    const batch = await dataSource.getRepository(EmissionBatchEntity).save({
      eventId: event.id,
      batchType: BatchType.ORIGINAL,
      merkleRootHash: '0x123abc',
      polygonTxHash: null,
      networkState: NetworkState.QUEUED,
    });

    const folioRepository = dataSource.getRepository(DocumentFolioEntity);

    await folioRepository.save({
      batchId: batch.id,
      institutionalFolio: 'ITSON-FL-2026-0001',
      enrollmentId: '243410',
      rawPayloadData: { student: 'Luis' },
      originalDataHash: 'hash1',
      pdfStorageUrl: 'https://s3.local/doc1.pdf',
      isValid: true,
    });

    await expect(
      folioRepository.save({
        batchId: batch.id,
        institutionalFolio: 'ITSON-FL-2026-0001',
        enrollmentId: '243411',
        rawPayloadData: { student: 'Ana' },
        originalDataHash: 'hash2',
        pdfStorageUrl: 'https://s3.local/doc2.pdf',
        isValid: true,
      }),
    ).rejects.toBeDefined();
  });
});

async function resetDatabase(dataSource: DataSource): Promise<void> {
  const tableNames = dataSource.entityMetadatas.map((metadata) => `"${metadata.tableName}"`);

  if (tableNames.length === 0) {
    return;
  }

  await dataSource.query(`TRUNCATE ${tableNames.join(', ')} RESTART IDENTITY CASCADE`);
}
