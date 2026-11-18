import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 5 of the Rently x SwapConnect campaign integration — a single-row
 * synced copy of the prize data pulled from SwapConnect's Partner API (see
 * SwapConnectIntegrationService.sync()). No FK to anything else: it's a
 * point-in-time external-data cache, not a domain entity with relationships.
 */
export class CreateCampaignPrizeSnapshot1722000000000 implements MigrationInterface {
  name = 'CreateCampaignPrizeSnapshot1722000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "campaign_prize_snapshots" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "swapconnect_campaign_id" text NOT NULL,
        "campaign_name" text NOT NULL,
        "campaign_summary" text,
        "campaign_external_url" text,
        "campaign_item_id" text,
        "prize_name" text,
        "prize_state" text,
        "synced_at" timestamptz NOT NULL,
        "synced_by_admin_id" uuid NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz
      );
    `);
    await queryRunner.query(`CREATE INDEX "ix_campaign_prize_snapshots_synced_at" ON "campaign_prize_snapshots" ("synced_at");`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "campaign_prize_snapshots"`);
  }
}
