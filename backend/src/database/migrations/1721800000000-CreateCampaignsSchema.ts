import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 2 of the Rently x SwapConnect campaign integration — Ambassador
 * Management + Referral Attribution + onboarding-milestone tracking. No
 * points/leaderboard yet (Phase 3) — referral_milestones carries no point
 * value, it's a pure achievement log.
 *
 * `ALTER TYPE ... ADD VALUE IF NOT EXISTS` is irreversible in Postgres (no
 * DROP VALUE) — same documented limitation as 1721700000000's additions to
 * listing_status_enum/notification_type_enum. down() reverses everything
 * else: drops the 3 new tables (children before parents) and the 2
 * permission rows/grants it inserted, but leaves 'ambassador' on
 * user_role_enum and the 5 new values on notification_type_enum in place.
 */
export class CreateCampaignsSchema1721800000000 implements MigrationInterface {
  name = 'CreateCampaignsSchema1721800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "ambassador_status_enum" AS ENUM ('pending','approved','active','suspended','disqualified');
      CREATE TYPE "referral_source_enum" AS ENUM ('link','manual_code','admin');
      CREATE TYPE "referral_status_enum" AS ENUM ('pending','qualified','rejected','reversed');
      CREATE TYPE "referral_milestone_type_enum" AS ENUM ('provider_registered','provider_verified','listing_approved','first_genuine_inquiry');
    `);

    await queryRunner.query(`
      CREATE TABLE "ambassador_profiles" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "status" ambassador_status_enum NOT NULL DEFAULT 'pending',
        "referral_code" text NOT NULL,
        "agreement_accepted_at" timestamptz NOT NULL,
        "approved_at" timestamptz,
        "approved_by_admin_id" uuid,
        "suspended_at" timestamptz,
        "suspended_reason" text,
        "disqualified_at" timestamptz,
        "disqualified_reason" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz
      );
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX "ux_ambassador_profiles_user_id" ON "ambassador_profiles" ("user_id");`);
    await queryRunner.query(`CREATE UNIQUE INDEX "ux_ambassador_profiles_referral_code" ON "ambassador_profiles" ("referral_code");`);

    await queryRunner.query(`
      CREATE TABLE "referral_attributions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "ambassador_id" uuid NOT NULL REFERENCES "ambassador_profiles"("id") ON DELETE CASCADE,
        "referred_user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "referral_code" text NOT NULL,
        "source" referral_source_enum NOT NULL,
        "attributed_by_admin_id" uuid,
        "status" referral_status_enum NOT NULL DEFAULT 'pending',
        "rejection_reason" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz
      );
    `);
    // Brief §6 rule 1 — a new Rental Partner must only ever be attributed to one ambassador. This unique index is the real guarantee; the service layer's own pre-check is just for a clean error message.
    await queryRunner.query(`CREATE UNIQUE INDEX "ux_referral_attributions_referred_user_id" ON "referral_attributions" ("referred_user_id");`);
    await queryRunner.query(`CREATE INDEX "ix_referral_attributions_ambassador_id" ON "referral_attributions" ("ambassador_id");`);

    await queryRunner.query(`
      CREATE TABLE "referral_milestones" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "referral_attribution_id" uuid NOT NULL REFERENCES "referral_attributions"("id") ON DELETE CASCADE,
        "milestone_type" referral_milestone_type_enum NOT NULL,
        "achieved_at" timestamptz NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz
      );
    `);
    // Brief §7 — "a milestone must only be awarded once per referral." DB-enforced, not just app logic (see ReferralMilestoneRepository.recordIfNew()).
    await queryRunner.query(`CREATE UNIQUE INDEX "ux_referral_milestones_attribution_type" ON "referral_milestones" ("referral_attribution_id", "milestone_type");`);

    // Each ADD VALUE runs as its own query() call, not combined into one
    // multi-statement string — matches 1721700000000's precedent (Postgres
    // is fussy about ALTER TYPE ... ADD VALUE sharing a statement batch).
    await queryRunner.query(`ALTER TYPE "user_role_enum" ADD VALUE IF NOT EXISTS 'ambassador';`);
    await queryRunner.query(`ALTER TYPE "notification_type_enum" ADD VALUE IF NOT EXISTS 'ambassador_registered';`);
    await queryRunner.query(`ALTER TYPE "notification_type_enum" ADD VALUE IF NOT EXISTS 'ambassador_approved';`);
    await queryRunner.query(`ALTER TYPE "notification_type_enum" ADD VALUE IF NOT EXISTS 'referral_attributed';`);
    await queryRunner.query(`ALTER TYPE "notification_type_enum" ADD VALUE IF NOT EXISTS 'referral_milestone_achieved';`);
    await queryRunner.query(`ALTER TYPE "notification_type_enum" ADD VALUE IF NOT EXISTS 'referral_rejected';`);

    // ---- extend the RBAC permission set (same pattern as CreateFinanceLedger extending CreateAdminRbac) ----
    await queryRunner.query(`
      INSERT INTO "permissions" ("key", "label", "module") VALUES
        ('campaigns.manage', 'Manage ambassadors (approve, suspend, disqualify)', 'Growth'),
        ('campaigns.moderate', 'Moderate referrals (manual attribution, rejection)', 'Growth');
    `);
    const grant = async (slug: string, keys: string[]) => {
      await queryRunner.query(
        `
        INSERT INTO "admin_role_permissions" ("admin_role_id", "permission_id")
        SELECT r."id", p."id"
        FROM "admin_roles" r, "permissions" p
        WHERE r."slug" = $1 AND p."key" = ANY($2::text[]);
      `,
        [slug, keys],
      );
    };
    // Content Admin already owns "Growth" territory (categories.manage) — a reasonable default grant, easy to adjust later via the Permissions admin UI.
    await grant('content-admin', ['campaigns.manage', 'campaigns.moderate']);
    await grant('full-admin', ['campaigns.manage', 'campaigns.moderate']);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "admin_role_permissions" WHERE "permission_id" IN (
        SELECT "id" FROM "permissions" WHERE "key" IN ('campaigns.manage', 'campaigns.moderate')
      );
    `);
    await queryRunner.query(`DELETE FROM "permissions" WHERE "key" IN ('campaigns.manage', 'campaigns.moderate');`);

    await queryRunner.query(`DROP TABLE IF EXISTS "referral_milestones"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "referral_attributions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ambassador_profiles"`);

    await queryRunner.query(`DROP TYPE IF EXISTS "referral_milestone_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "referral_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "referral_source_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "ambassador_status_enum"`);
    // 'ambassador' stays on user_role_enum and the 5 new notification_type_enum values stay too — Postgres cannot DROP VALUE from an enum.
  }
}
