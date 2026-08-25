import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Per-unit inventory: a listing with zero `assets` rows behaves exactly as
 * before this migration (implicit single unit, `bookings.asset_id` stays
 * null) — no backfill needed for any existing listing or booking.
 *
 * The `no_overlapping_bookings` EXCLUDE constraint's key changes from
 * `listing_id` to `COALESCE(asset_id, listing_id)`: single-unit listings
 * (asset_id always null) keep the exact same guarantee as before; a
 * multi-asset listing can now have up to N concurrent overlapping bookings
 * (one per asset) while the constraint still makes it impossible to
 * double-book the *same* asset. `btree_gist` was already enabled by the
 * identity migration, so a `COALESCE` expression in the exclusion works the
 * same way the plain column did.
 */
export class AddAssetsAndPerUnitBooking1720700000000 implements MigrationInterface {
  name = 'AddAssetsAndPerUnitBooking1720700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "asset_provider_status_enum" AS ENUM ('active','maintenance','retired');
    `);
    await queryRunner.query(`
      CREATE TABLE "assets" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "listing_id" uuid NOT NULL REFERENCES "listings"("id") ON DELETE CASCADE,
        "label" text NOT NULL,
        "condition" listing_condition_enum NOT NULL DEFAULT 'good',
        "provider_status" asset_provider_status_enum NOT NULL DEFAULT 'active',
        "notes" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz
      );
      CREATE INDEX "ix_assets_listing" ON "assets" ("listing_id");
    `);

    await queryRunner.query(`
      ALTER TABLE "bookings" ADD COLUMN "asset_id" uuid REFERENCES "assets"("id");
      CREATE INDEX "ix_bookings_asset" ON "bookings" ("asset_id");

      ALTER TABLE "bookings" DROP CONSTRAINT "no_overlapping_bookings";
      ALTER TABLE "bookings"
        ADD CONSTRAINT "no_overlapping_bookings"
        EXCLUDE USING gist (COALESCE("asset_id", "listing_id") WITH =, "during" WITH &&)
        WHERE ("status" IN ('confirmed','pending'));
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "bookings" DROP CONSTRAINT "no_overlapping_bookings";
      ALTER TABLE "bookings"
        ADD CONSTRAINT "no_overlapping_bookings"
        EXCLUDE USING gist ("listing_id" WITH =, "during" WITH &&)
        WHERE ("status" IN ('confirmed','pending'));

      DROP INDEX IF EXISTS "ix_bookings_asset";
      ALTER TABLE "bookings" DROP COLUMN IF EXISTS "asset_id";
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS "assets"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "asset_provider_status_enum"`);
  }
}
