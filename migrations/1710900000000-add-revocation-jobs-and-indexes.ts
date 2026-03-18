import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRevocationJobsAndIndexes1710900000000 implements MigrationInterface {
  name = 'AddRevocationJobsAndIndexes1710900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "revocation_jobs" (
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "id" character varying(200) NOT NULL,
        "idempotencyKey" character varying(200) NOT NULL,
        "eventId" uuid NOT NULL,
        "hashToRevoke" character varying(128) NOT NULL,
        "status" character varying(20) NOT NULL,
        "attemptCount" integer NOT NULL DEFAULT 0,
        "maxAttempts" integer NOT NULL DEFAULT 5,
        "nextRetryAt" TIMESTAMPTZ NOT NULL,
        "txHash" character varying(130),
        "lastError" text,
        CONSTRAINT "PK_revocation_jobs_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_revocation_jobs_idempotencyKey"
      ON "revocation_jobs" ("idempotencyKey")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_revocation_jobs_status_nextRetryAt"
      ON "revocation_jobs" ("status", "nextRetryAt")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_document_folios_originalDataHash"
      ON "document_folios" ("originalDataHash")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_document_folios_enrollmentId"
      ON "document_folios" ("enrollmentId")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_emission_batches_eventId"
      ON "emission_batches" ("eventId")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_events_consensusStatus"
      ON "events" ("consensusStatus")
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'FK_revocation_jobs_eventId'
        ) THEN
          ALTER TABLE "revocation_jobs"
          ADD CONSTRAINT "FK_revocation_jobs_eventId"
          FOREIGN KEY ("eventId") REFERENCES "events"("id")
          ON DELETE CASCADE ON UPDATE NO ACTION;
        END IF;
      END
      $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_events_consensusStatus"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_emission_batches_eventId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_document_folios_enrollmentId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_document_folios_originalDataHash"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_revocation_jobs_status_nextRetryAt"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_revocation_jobs_idempotencyKey"`);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'FK_revocation_jobs_eventId'
        ) THEN
          ALTER TABLE "revocation_jobs"
          DROP CONSTRAINT "FK_revocation_jobs_eventId";
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`DROP TABLE IF EXISTS "revocation_jobs"`);
  }
}
