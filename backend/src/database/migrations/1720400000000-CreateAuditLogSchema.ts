import { MigrationInterface, QueryRunner } from 'typeorm';

/** Application-level audit trail — see src/common/audit/audit-log.entity.ts for why this is a plain table write, not a Postgres trigger. */
export class CreateAuditLogSchema1720400000000 implements MigrationInterface {
  name = 'CreateAuditLogSchema1720400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "audit_actor_type_enum" AS ENUM ('admin','system','user');
    `);
    await queryRunner.query(`
      CREATE TABLE "audit_log" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "actor_id" uuid,
        "actor_type" audit_actor_type_enum NOT NULL DEFAULT 'admin',
        "action" text NOT NULL,
        "entity_type" text NOT NULL,
        "entity_id" uuid NOT NULL,
        "before" jsonb,
        "after" jsonb,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz
      );
      CREATE INDEX "ix_audit_log_entity" ON "audit_log" ("entity_type", "entity_id");
      CREATE INDEX "ix_audit_log_actor" ON "audit_log" ("actor_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_log"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "audit_actor_type_enum"`);
  }
}
