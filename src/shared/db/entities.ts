import { AuditLogEntity } from '@/src/modules/audits/infrastructure/entities/audit-log.entity';
import { DocumentFolioEntity } from '@/src/modules/documents/infrastructure/entities/document-folio.entity';
import { EmissionBatchEntity } from '@/src/modules/documents/infrastructure/entities/emission-batch.entity';
import { TemplateSequenceEntity } from '@/src/modules/documents/infrastructure/entities/template-sequence.entity';
import { EventEntity } from '@/src/modules/events/infrastructure/entities/event.entity';
import { RevocationJobEntity } from '@/src/modules/events/infrastructure/entities/revocation-job.entity';
import { SignerConsensusEntity } from '@/src/modules/events/infrastructure/entities/signer-consensus.entity';
import { DocumentTemplateEntity } from '@/src/modules/templates/infrastructure/entities/document-template.entity';
import { SignatureVaultEntity } from '@/src/modules/users/infrastructure/entities/signature-vault.entity';
import { UserEntity } from '@/src/modules/users/infrastructure/entities/user.entity';

export const APP_ENTITIES = [
  UserEntity,
  SignatureVaultEntity,
  DocumentTemplateEntity,
  EventEntity,
  RevocationJobEntity,
  SignerConsensusEntity,
  TemplateSequenceEntity,
  EmissionBatchEntity,
  DocumentFolioEntity,
  AuditLogEntity,
] as const;
