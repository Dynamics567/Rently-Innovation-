import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 3 of the Rently x SwapConnect campaign integration — the points
 * engine. Append-only ledger, modeled directly on finance's
 * CreateFinanceLedger migration: no stored balance column anywhere, a
 * balance is always `SUM(points_delta)` computed on demand (see
 * PointsLedgerRepository.getBalance()).
 */
export class CreateCampaignsPointsLedger1721900000000 implements MigrationInterface {
  name = 'CreateCampaignsPointsLedger1721900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "points_ledger_entry_type_enum" AS ENUM ('milestone_award','manual_adjustment','reversal');`);

    await queryRunner.query(`
      CREATE TABLE "points_ledger_entries" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "ambassador_id" uuid NOT NULL REFERENCES "ambassador_profiles"("id") ON DELETE CASCADE,
        "type" points_ledger_entry_type_enum NOT NULL,
        "points_delta" int NOT NULL,
        "source_entity_type" text,
        "source_entity_id" uuid,
        "reason" text,
        "created_by_admin_id" uuid,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz
      );
    `);
    await queryRunner.query(`CREATE INDEX "ix_points_ledger_entries_ambassador_id" ON "points_ledger_entries" ("ambassador_id");`);
    // Backs the leaderboard's running-total window function and the per-ambassador history's cursor pagination — both order by (created_at, id).
    await queryRunner.query(`CREATE INDEX "ix_points_ledger_entries_ambassador_created" ON "points_ledger_entries" ("ambassador_id", "created_at", "id");`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "points_ledger_entries"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "points_ledger_entry_type_enum"`);
  }
}
