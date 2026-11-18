import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 7 of the Rently x SwapConnect campaign integration — traffic
 * attribution (campaign_traffic_events, no PII: see the entity's own doc
 * comment) and the fraud-review record (referral_fraud_flags, what
 * SignupReferralListener's catch block used to just log and discard).
 */
export class CreateCampaignTrafficAndFraudFlags1722100000000 implements MigrationInterface {
  name = 'CreateCampaignTrafficAndFraudFlags1722100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "campaign_traffic_event_type_enum" AS ENUM ('page_view','cta_click');`);

    await queryRunner.query(`
      CREATE TABLE "campaign_traffic_events" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "type" campaign_traffic_event_type_enum NOT NULL,
        "path" text NOT NULL,
        "referral_code" text,
        "utm_source" text,
        "utm_medium" text,
        "utm_campaign" text,
        "referrer_host" text,
        "session_key" text NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz
      );
    `);
    // Backs both countsSince() and dailySeriesSince() — both filter/group on (createdAt, type).
    await queryRunner.query(`CREATE INDEX "ix_campaign_traffic_events_created_type" ON "campaign_traffic_events" ("created_at", "type");`);

    await queryRunner.query(`
      CREATE TABLE "referral_fraud_flags" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "referral_code" text,
        "attempted_user_id" uuid NOT NULL,
        "reason_code" text NOT NULL,
        "message" text NOT NULL,
        "acknowledged_at" timestamptz,
        "acknowledged_by_admin_id" uuid,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz
      );
    `);
    await queryRunner.query(`CREATE INDEX "ix_referral_fraud_flags_acknowledged_at" ON "referral_fraud_flags" ("acknowledged_at");`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "referral_fraud_flags"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "campaign_traffic_events"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "campaign_traffic_event_type_enum"`);
  }
}
