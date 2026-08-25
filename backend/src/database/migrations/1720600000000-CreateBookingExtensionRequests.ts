import { MigrationInterface, QueryRunner } from 'typeorm';

/** Backs BookingService.requestExtension()/approveExtension() — a renter asking to push a rental's end date out while ACTIVE. */
export class CreateBookingExtensionRequests1720600000000 implements MigrationInterface {
  name = 'CreateBookingExtensionRequests1720600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "extension_request_status_enum" AS ENUM ('pending','approved','declined','cancelled');
    `);
    await queryRunner.query(`
      CREATE TABLE "booking_extension_requests" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "booking_id" uuid NOT NULL REFERENCES "bookings"("id") ON DELETE CASCADE,
        "requested_by" uuid NOT NULL REFERENCES "users"("id"),
        "current_ends_at" timestamptz NOT NULL,
        "requested_ends_at" timestamptz NOT NULL,
        "status" extension_request_status_enum NOT NULL DEFAULT 'pending',
        "additional_rental_fee_minor" bigint,
        "additional_service_fee_minor" bigint,
        "decided_by" uuid,
        "decided_at" timestamptz,
        "decline_reason" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz
      );
      CREATE INDEX "ix_booking_extension_requests_booking" ON "booking_extension_requests" ("booking_id");
      -- A real DB guarantee against a double-request race, same philosophy as
      -- bookings.idempotency_key's partial unique index.
      CREATE UNIQUE INDEX "uq_pending_extension_per_booking" ON "booking_extension_requests" ("booking_id") WHERE "status" = 'pending';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "booking_extension_requests"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "extension_request_status_enum"`);
  }
}
