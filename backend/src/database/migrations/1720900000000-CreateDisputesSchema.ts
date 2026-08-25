import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Finally uses BookingStatus.DISPUTED, which existed in the enum since the
 * original booking migration but nothing ever set it. See
 * BookingService.recordInspection()/finalizeDispute() and DisputeService.
 */
export class CreateDisputesSchema1720900000000 implements MigrationInterface {
  name = 'CreateDisputesSchema1720900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "dispute_status_enum" AS ENUM ('open','proposed','contested','resolved');
      CREATE TYPE "dispute_resolution_enum" AS ENUM ('agreed','admin_decided');
    `);
    await queryRunner.query(`
      CREATE TABLE "disputes" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "booking_id" uuid NOT NULL UNIQUE REFERENCES "bookings"("id") ON DELETE CASCADE,
        "opened_by" uuid NOT NULL REFERENCES "users"("id"),
        "description" text NOT NULL,
        "evidence_keys" text[] NOT NULL DEFAULT '{}',
        "status" dispute_status_enum NOT NULL DEFAULT 'open',
        "proposed_deduction_minor" bigint,
        "proposed_by" uuid,
        "proposed_at" timestamptz,
        "proposal_note" text,
        "final_deduction_minor" bigint,
        "resolution" dispute_resolution_enum,
        "resolved_by" uuid,
        "resolved_at" timestamptz,
        "resolution_note" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "disputes"`);
    await queryRunner.query(`
      DROP TYPE IF EXISTS "dispute_resolution_enum";
      DROP TYPE IF EXISTS "dispute_status_enum";
    `);
  }
}
