import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1710800000000 implements MigrationInterface {
  name = 'InitialSchema1710800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "users_rolesassigned_enum" AS ENUM ('ADMIN', 'CREATOR', 'SIGNER', 'AUDITOR')`);
    await queryRunner.query(`CREATE TYPE "events_consensusstatus_enum" AS ENUM ('PENDIENTE', 'AUTORIZADO', 'FIRMADO', 'COMPLETADO', 'RECHAZADO')`);
    await queryRunner.query(`CREATE TYPE "emission_batches_batchtype_enum" AS ENUM ('ORIGINAL', 'COMPLEMENTARIO')`);
    await queryRunner.query(`CREATE TYPE "emission_batches_networkstate_enum" AS ENUM ('EN_COLA', 'CONFIRMADO', 'FALLIDO')`);
    await queryRunner.query(`CREATE TYPE "audit_logs_action_enum" AS ENUM ('CREAR', 'AUTORIZAR', 'FIRMAR', 'GENERAR_DOCS', 'REVOCAR', 'ACTUALIZAR', 'ELIMINAR')`);

    await queryRunner.query(`
      CREATE TABLE "users" (
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "fullName" character varying(200) NOT NULL,
        "institutionalEmail" character varying(200) NOT NULL,
        "rolesAssigned" "users_rolesassigned_enum" array NOT NULL DEFAULT ARRAY['CREATOR']::"users_rolesassigned_enum"[],
        CONSTRAINT "UQ_users_institutionalEmail" UNIQUE ("institutionalEmail"),
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "signature_vaults" (
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "officialPosition" character varying(150) NOT NULL,
        "signaturePngUrl" character varying(500) NOT NULL,
        CONSTRAINT "UQ_signature_vaults_userId" UNIQUE ("userId"),
        CONSTRAINT "PK_signature_vaults_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "document_templates" (
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "templateName" character varying(180) NOT NULL,
        "folioPrefix" character varying(20) NOT NULL,
        "craftSchemaJson" jsonb NOT NULL,
        "creatorId" uuid NOT NULL,
        CONSTRAINT "UQ_document_templates_folioPrefix" UNIQUE ("folioPrefix"),
        CONSTRAINT "PK_document_templates_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "events" (
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "eventName" character varying(220) NOT NULL,
        "templateId" uuid NOT NULL,
        "creatorId" uuid NOT NULL,
        "consensusStatus" "events_consensusstatus_enum" NOT NULL DEFAULT 'PENDIENTE',
        "web3Enabled" boolean NOT NULL DEFAULT true,
        "globalContextInjected" jsonb NOT NULL DEFAULT '{}',
        CONSTRAINT "PK_events_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "signer_consensus" (
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "eventId" uuid NOT NULL,
        "signatureVaultId" uuid NOT NULL,
        "approved" boolean,
        "signedAt" TIMESTAMPTZ,
        CONSTRAINT "UQ_signer_consensus_eventId_signatureVaultId" UNIQUE ("eventId", "signatureVaultId"),
        CONSTRAINT "PK_signer_consensus_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "template_sequences" (
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "templateId" uuid NOT NULL,
        "emissionYear" integer NOT NULL,
        "currentSequence" integer NOT NULL DEFAULT 0,
        CONSTRAINT "UQ_template_sequences_templateId_emissionYear" UNIQUE ("templateId", "emissionYear"),
        CONSTRAINT "PK_template_sequences_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "emission_batches" (
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "eventId" uuid NOT NULL,
        "batchType" "emission_batches_batchtype_enum" NOT NULL,
        "merkleRootHash" character varying(128) NOT NULL,
        "polygonTxHash" character varying(128),
        "networkState" "emission_batches_networkstate_enum" NOT NULL DEFAULT 'EN_COLA',
        CONSTRAINT "PK_emission_batches_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "document_folios" (
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "batchId" uuid NOT NULL,
        "institutionalFolio" character varying(80) NOT NULL,
        "enrollmentId" character varying(40) NOT NULL,
        "rawPayloadData" jsonb NOT NULL,
        "originalDataHash" character varying(128) NOT NULL,
        "pdfStorageUrl" character varying(700) NOT NULL,
        "isValid" boolean NOT NULL DEFAULT true,
        CONSTRAINT "UQ_document_folios_institutionalFolio" UNIQUE ("institutionalFolio"),
        CONSTRAINT "PK_document_folios_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "audit_logs" (
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "action" "audit_logs_action_enum" NOT NULL,
        "affectedEntity" character varying(90) NOT NULL,
        "affectedEntityId" character varying(60) NOT NULL,
        "detailSnapshot" jsonb NOT NULL,
        "sourceIp" character varying(50),
        CONSTRAINT "PK_audit_logs_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`ALTER TABLE "signature_vaults" ADD CONSTRAINT "FK_signature_vaults_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "document_templates" ADD CONSTRAINT "FK_document_templates_creatorId" FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "events" ADD CONSTRAINT "FK_events_templateId" FOREIGN KEY ("templateId") REFERENCES "document_templates"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "events" ADD CONSTRAINT "FK_events_creatorId" FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "signer_consensus" ADD CONSTRAINT "FK_signer_consensus_eventId" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "signer_consensus" ADD CONSTRAINT "FK_signer_consensus_signatureVaultId" FOREIGN KEY ("signatureVaultId") REFERENCES "signature_vaults"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "template_sequences" ADD CONSTRAINT "FK_template_sequences_templateId" FOREIGN KEY ("templateId") REFERENCES "document_templates"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "emission_batches" ADD CONSTRAINT "FK_emission_batches_eventId" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "document_folios" ADD CONSTRAINT "FK_document_folios_batchId" FOREIGN KEY ("batchId") REFERENCES "emission_batches"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "audit_logs" ADD CONSTRAINT "FK_audit_logs_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "audit_logs" DROP CONSTRAINT "FK_audit_logs_userId"`);
    await queryRunner.query(`ALTER TABLE "document_folios" DROP CONSTRAINT "FK_document_folios_batchId"`);
    await queryRunner.query(`ALTER TABLE "emission_batches" DROP CONSTRAINT "FK_emission_batches_eventId"`);
    await queryRunner.query(`ALTER TABLE "template_sequences" DROP CONSTRAINT "FK_template_sequences_templateId"`);
    await queryRunner.query(`ALTER TABLE "signer_consensus" DROP CONSTRAINT "FK_signer_consensus_signatureVaultId"`);
    await queryRunner.query(`ALTER TABLE "signer_consensus" DROP CONSTRAINT "FK_signer_consensus_eventId"`);
    await queryRunner.query(`ALTER TABLE "events" DROP CONSTRAINT "FK_events_creatorId"`);
    await queryRunner.query(`ALTER TABLE "events" DROP CONSTRAINT "FK_events_templateId"`);
    await queryRunner.query(`ALTER TABLE "document_templates" DROP CONSTRAINT "FK_document_templates_creatorId"`);
    await queryRunner.query(`ALTER TABLE "signature_vaults" DROP CONSTRAINT "FK_signature_vaults_userId"`);

    await queryRunner.query(`DROP TABLE "audit_logs"`);
    await queryRunner.query(`DROP TABLE "document_folios"`);
    await queryRunner.query(`DROP TABLE "emission_batches"`);
    await queryRunner.query(`DROP TABLE "template_sequences"`);
    await queryRunner.query(`DROP TABLE "signer_consensus"`);
    await queryRunner.query(`DROP TABLE "events"`);
    await queryRunner.query(`DROP TABLE "document_templates"`);
    await queryRunner.query(`DROP TABLE "signature_vaults"`);
    await queryRunner.query(`DROP TABLE "users"`);

    await queryRunner.query(`DROP TYPE "audit_logs_action_enum"`);
    await queryRunner.query(`DROP TYPE "emission_batches_networkstate_enum"`);
    await queryRunner.query(`DROP TYPE "emission_batches_batchtype_enum"`);
    await queryRunner.query(`DROP TYPE "events_consensusstatus_enum"`);
    await queryRunner.query(`DROP TYPE "users_rolesassigned_enum"`);
  }
}
