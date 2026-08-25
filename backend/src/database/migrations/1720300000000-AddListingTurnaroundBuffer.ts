import { MigrationInterface, QueryRunner } from 'typeorm';

/** Backs BookingService.create()'s buffer-aware overlap check — see Listing.turnaroundBufferMinutes. */
export class AddListingTurnaroundBuffer1720300000000 implements MigrationInterface {
  name = 'AddListingTurnaroundBuffer1720300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "listings" ADD COLUMN "turnaround_buffer_minutes" int NOT NULL DEFAULT 120;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "listings" DROP COLUMN IF EXISTS "turnaround_buffer_minutes"`);
  }
}
