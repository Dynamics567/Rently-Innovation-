import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Backs ReviewsService — the missing piece that finally makes
 * Listing.avgRating/reviewCount and ProviderProfile.avgRating real instead
 * of permanently stuck at their default.
 */
export class CreateReviewsSchema1720800000000 implements MigrationInterface {
  name = 'CreateReviewsSchema1720800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "review_direction_enum" AS ENUM ('renter_to_provider','provider_to_renter');
    `);
    await queryRunner.query(`
      CREATE TABLE "reviews" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "booking_id" uuid NOT NULL REFERENCES "bookings"("id") ON DELETE CASCADE,
        "listing_id" uuid NOT NULL REFERENCES "listings"("id"),
        "author_id" uuid NOT NULL REFERENCES "users"("id"),
        "target_id" uuid NOT NULL REFERENCES "users"("id"),
        "direction" review_direction_enum NOT NULL,
        "rating" smallint NOT NULL,
        "comment" text,
        "provider_response" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,
        CONSTRAINT "chk_reviews_rating_range" CHECK ("rating" BETWEEN 1 AND 5)
      );
      CREATE UNIQUE INDEX "uq_reviews_booking_direction" ON "reviews" ("booking_id", "direction");
      CREATE INDEX "ix_reviews_listing" ON "reviews" ("listing_id");
      CREATE INDEX "ix_reviews_target" ON "reviews" ("target_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "reviews"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "review_direction_enum"`);
  }
}
