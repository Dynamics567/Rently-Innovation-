import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds the real review-feedback fields a Rental Partner needs to act on
 * admin decisions (a reject/changes-requested reason, a flag) — see the
 * "Listing Image Requirements & Admin Review" plan. `ALTER TYPE ... ADD
 * VALUE` is used for both new enum values because `listing_status_enum`
 * and `notification_type_enum` are real native Postgres enum types
 * (confirmed via 1719900000000-CreateCatalogSchema.ts and
 * 1720500000000-CreateNotificationsSchema.ts), not plain text columns.
 *
 * Postgres cannot remove an enum value once added — `down()` can only
 * revert the new table columns; `changes_requested` and the three new
 * notification types are permanent additions to those two enums.
 */
export class AddListingReviewFields1721700000000 implements MigrationInterface {
  name = 'AddListingReviewFields1721700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE "listing_status_enum" ADD VALUE IF NOT EXISTS 'changes_requested';`);
    await queryRunner.query(`ALTER TYPE "notification_type_enum" ADD VALUE IF NOT EXISTS 'listing_submitted';`);
    await queryRunner.query(`ALTER TYPE "notification_type_enum" ADD VALUE IF NOT EXISTS 'listing_changes_requested';`);
    await queryRunner.query(`ALTER TYPE "notification_type_enum" ADD VALUE IF NOT EXISTS 'listing_flagged';`);

    await queryRunner.query(`
      ALTER TABLE "listings"
        ADD COLUMN "rejection_reason" text,
        ADD COLUMN "changes_requested_reason" text,
        ADD COLUMN "flagged_at" timestamptz,
        ADD COLUMN "flag_reason" text;
    `);
    await queryRunner.query(`
      ALTER TABLE "listing_photos"
        ADD COLUMN "flagged_at" timestamptz,
        ADD COLUMN "flag_reason" text;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "listing_photos"
        DROP COLUMN IF EXISTS "flagged_at",
        DROP COLUMN IF EXISTS "flag_reason";
    `);
    await queryRunner.query(`
      ALTER TABLE "listings"
        DROP COLUMN IF EXISTS "rejection_reason",
        DROP COLUMN IF EXISTS "changes_requested_reason",
        DROP COLUMN IF EXISTS "flagged_at",
        DROP COLUMN IF EXISTS "flag_reason";
    `);
    // 'changes_requested' / the three new notification types are NOT removed
    // here — Postgres has no ALTER TYPE ... DROP VALUE, by design.
  }
}
