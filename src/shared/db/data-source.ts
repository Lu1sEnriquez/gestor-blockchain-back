import 'reflect-metadata';
import 'dotenv/config';

import { DataSource } from 'typeorm';
import { UserEntity } from '@/src/modules/users/infrastructure/entities/user.entity';
import { SignatureVaultEntity } from '@/src/modules/users/infrastructure/entities/signature-vault.entity';
import { DocumentTemplateEntity } from '@/src/modules/templates/infrastructure/entities/document-template.entity';
import { DocumentFolioEntity } from '@/src/modules/documents/infrastructure/entities/document-folio.entity';
import { EmissionBatchEntity } from '@/src/modules/documents/infrastructure/entities/emission-batch.entity';
import { TemplateSequenceEntity } from '@/src/modules/documents/infrastructure/entities/template-sequence.entity';
import { EventEntity } from '@/src/modules/events/infrastructure/entities/event.entity';
import { SignerConsensusEntity } from '@/src/modules/events/infrastructure/entities/signer-consensus.entity';
import { RevocationJobEntity } from '@/src/modules/events/infrastructure/entities/revocation-job.entity';
import { AuditLogEntity } from '@/src/modules/audits/infrastructure/entities/audit-log.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [
    UserEntity,
    SignatureVaultEntity,
    DocumentTemplateEntity,
    DocumentFolioEntity,
    EmissionBatchEntity,
    TemplateSequenceEntity,
    EventEntity,
    SignerConsensusEntity,
    RevocationJobEntity,
    AuditLogEntity,
  ],
  migrations: [],
  synchronize: process.env.NODE_ENV !== 'production',
  logging: process.env.NODE_ENV === 'development',
});
