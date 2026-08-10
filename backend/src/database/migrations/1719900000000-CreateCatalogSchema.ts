import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Catalog module — categories, listings, listing photos, manual availability
 * blocks. See docs/DATABASE_SCHEMA.md; two deviations from that doc, both
 * noted in the Phase 1 plan:
 *  1. No PostGIS — `listings.location` is plain lat/lng numeric + text,
 *     not `geography(Point,4326)` (extension unavailable on Railway Postgres).
 *  2. `availability_blocks.during` (tstzrange) is duplicated as plain
 *     `starts_at`/`ends_at` timestamptz columns for easy reads without
 *     parsing Postgres range literal syntax in application code.
 */
export class CreateCatalogSchema1719900000000 implements MigrationInterface {
  name = 'CreateCatalogSchema1719900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "price_unit_enum" AS ENUM ('hour','day','week','month');
      CREATE TYPE "listing_condition_enum" AS ENUM ('new','like_new','good','fair');
      CREATE TYPE "cancellation_policy_enum" AS ENUM ('flexible','moderate','strict');
      CREATE TYPE "booking_mode_enum" AS ENUM ('instant','request');
      CREATE TYPE "listing_status_enum" AS ENUM ('draft','pending_review','live','paused','rejected');
    `);

    await queryRunner.query(`
      CREATE TABLE "categories" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "parent_id" uuid REFERENCES "categories"("id") ON DELETE SET NULL,
        "name" text NOT NULL,
        "slug" text NOT NULL,
        "attribute_schema" jsonb NOT NULL DEFAULT '{}',
        "commission_rate_bps" int NOT NULL DEFAULT 500,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz
      );
      CREATE UNIQUE INDEX "uq_categories_slug" ON "categories" ("slug");
    `);

    await queryRunner.query(`
      CREATE TABLE "listings" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "provider_id" uuid NOT NULL REFERENCES "provider_profiles"("id") ON DELETE CASCADE,
        "category_id" uuid NOT NULL REFERENCES "categories"("id"),
        "title" text NOT NULL,
        "description" text NOT NULL,
        "attributes" jsonb NOT NULL DEFAULT '{}',
        "price_minor" bigint NOT NULL,
        "price_unit" price_unit_enum NOT NULL,
        "deposit_minor" bigint,
        "lat" numeric(9,6),
        "lng" numeric(9,6),
        "location_text" text NOT NULL,
        "condition" listing_condition_enum NOT NULL DEFAULT 'good',
        "min_duration" int NOT NULL DEFAULT 1,
        "max_duration" int,
        "cancellation_policy" cancellation_policy_enum NOT NULL DEFAULT 'moderate',
        "booking_mode" booking_mode_enum NOT NULL DEFAULT 'request',
        "status" listing_status_enum NOT NULL DEFAULT 'draft',
        "avg_rating" numeric(2,1) NOT NULL DEFAULT 0,
        "review_count" int NOT NULL DEFAULT 0,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz
      );
      CREATE INDEX "ix_listings_category_status" ON "listings" ("category_id", "status");
      CREATE INDEX "ix_listings_provider" ON "listings" ("provider_id");
      CREATE INDEX "ix_listings_attributes" ON "listings" USING GIN ("attributes");
    `);

    await queryRunner.query(`
      CREATE TABLE "listing_photos" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "listing_id" uuid NOT NULL REFERENCES "listings"("id") ON DELETE CASCADE,
        "storage_key" text NOT NULL,
        "position" int NOT NULL DEFAULT 0,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz
      );
      CREATE INDEX "ix_listing_photos_listing_position" ON "listing_photos" ("listing_id", "position");
    `);

    await queryRunner.query(`
      CREATE TABLE "availability_blocks" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "listing_id" uuid NOT NULL REFERENCES "listings"("id") ON DELETE CASCADE,
        "during" tstzrange NOT NULL,
        "starts_at" timestamptz NOT NULL,
        "ends_at" timestamptz NOT NULL,
        "reason" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz
      );
      CREATE INDEX "ix_availability_blocks_listing" ON "availability_blocks" ("listing_id");
      CREATE INDEX "ix_availability_blocks_during" ON "availability_blocks" USING GIST ("during");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "availability_blocks"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "listing_photos"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "listings"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "categories"`);
    await queryRunner.query(`
      DROP TYPE IF EXISTS "listing_status_enum";
      DROP TYPE IF EXISTS "booking_mode_enum";
      DROP TYPE IF EXISTS "cancellation_policy_enum";
      DROP TYPE IF EXISTS "listing_condition_enum";
      DROP TYPE IF EXISTS "price_unit_enum";
    `);
  }
}
