import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Booking module. Reuses `booking_mode_enum`/`cancellation_policy_enum`
 * created by CreateCatalogSchema (snapshotted from the listing at booking
 * time, per docs/DATABASE_SCHEMA.md). `btree_gist` was already enabled by
 * the identity migration.
 *
 * The double-booking prevention constraint is the single most important
 * line in this file — see docs/ARCHITECTURE.md §4.1. It is a DATABASE
 * guarantee, not an application-level check-then-write, so it holds under
 * any concurrency level.
 */
export class CreateBookingSchema1720000000000 implements MigrationInterface {
  name = 'CreateBookingSchema1720000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "booking_status_enum" AS ENUM ('pending','confirmed','declined','cancelled','completed','disputed');
      CREATE TYPE "booking_stage_enum" AS ENUM (
        'requested','accepted','payment','reserved','ready','pickedup',
        'active','returnsched','returned','inspected','depositreleased','completed'
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "bookings" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "listing_id" uuid NOT NULL REFERENCES "listings"("id"),
        "renter_id" uuid NOT NULL REFERENCES "users"("id"),
        "during" tstzrange NOT NULL,
        "starts_at" timestamptz NOT NULL,
        "ends_at" timestamptz NOT NULL,
        "status" booking_status_enum NOT NULL DEFAULT 'pending',
        "stage" booking_stage_enum NOT NULL DEFAULT 'requested',
        "booking_mode" booking_mode_enum NOT NULL,
        "rental_fee_minor" bigint NOT NULL,
        "service_fee_minor" bigint NOT NULL,
        "deposit_minor" bigint NOT NULL DEFAULT 0,
        "total_minor" bigint NOT NULL,
        "cancellation_policy" cancellation_policy_enum NOT NULL,
        "idempotency_key" text,
        "payment_reference" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz
      );
      CREATE INDEX "ix_bookings_renter" ON "bookings" ("renter_id");
      CREATE INDEX "ix_bookings_listing" ON "bookings" ("listing_id");
      CREATE UNIQUE INDEX "uq_bookings_idempotency_key" ON "bookings" ("idempotency_key") WHERE "idempotency_key" IS NOT NULL;

      ALTER TABLE "bookings"
        ADD CONSTRAINT "no_overlapping_bookings"
        EXCLUDE USING gist ("listing_id" WITH =, "during" WITH &&)
        WHERE ("status" IN ('confirmed','pending'));
    `);

    await queryRunner.query(`
      CREATE TABLE "booking_status_history" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "booking_id" uuid NOT NULL REFERENCES "bookings"("id") ON DELETE CASCADE,
        "from_status" booking_status_enum,
        "to_status" booking_status_enum NOT NULL,
        "from_stage" booking_stage_enum,
        "to_stage" booking_stage_enum NOT NULL,
        "changed_by" uuid,
        "reason" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz
      );
      CREATE INDEX "ix_booking_status_history_booking" ON "booking_status_history" ("booking_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "booking_status_history"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "bookings"`);
    await queryRunner.query(`
      DROP TYPE IF EXISTS "booking_stage_enum";
      DROP TYPE IF EXISTS "booking_status_enum";
    `);
  }
}
