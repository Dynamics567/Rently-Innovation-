import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Bulk quantity for fungible listings (e.g. "50 chairs"), distinct from the
 * per-unit Asset system (which tracks individually distinguishable units
 * like specific cars). `listings.quantity_available` defaults to 1 so every
 * existing listing keeps today's exact single-unit behavior unchanged;
 * `bookings.quantity` defaults to 1 for the same reason on the booking side.
 */
export class AddBulkQuantityToListingsAndBookings1721200000000 implements MigrationInterface {
  name = 'AddBulkQuantityToListingsAndBookings1721200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "listings"
      ADD COLUMN "quantity_available" int NOT NULL DEFAULT 1
      CHECK ("quantity_available" > 0);
    `);
    await queryRunner.query(`
      ALTER TABLE "bookings"
      ADD COLUMN "quantity" int NOT NULL DEFAULT 1
      CHECK ("quantity" > 0);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "bookings" DROP COLUMN "quantity"`);
    await queryRunner.query(`ALTER TABLE "listings" DROP COLUMN "quantity_available"`);
  }
}
