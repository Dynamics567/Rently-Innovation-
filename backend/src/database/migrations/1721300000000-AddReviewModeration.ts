import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `reviews` has had no moderation surface at all — a flagged/abusive review
 * had no admin-facing way to be hidden from public listing/provider pages.
 * `status` defaults to visible so every existing row is unaffected; hiding
 * a review is reversible (unhide), never a delete, matching this project's
 * soft-delete-everything convention (see BaseEntity's deletedAt).
 */
export class AddReviewModeration1721300000000 implements MigrationInterface {
  name = 'AddReviewModeration1721300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "reviews_status_enum" AS ENUM ('visible', 'hidden');`);
    await queryRunner.query(`
      ALTER TABLE "reviews"
      ADD COLUMN "status" "reviews_status_enum" NOT NULL DEFAULT 'visible',
      ADD COLUMN "moderated_by" uuid,
      ADD COLUMN "moderated_at" timestamptz,
      ADD COLUMN "moderation_reason" text;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "reviews"
      DROP COLUMN IF EXISTS "status",
      DROP COLUMN IF EXISTS "moderated_by",
      DROP COLUMN IF EXISTS "moderated_at",
      DROP COLUMN IF EXISTS "moderation_reason";
    `);
    await queryRunner.query(`DROP TYPE IF EXISTS "reviews_status_enum"`);
  }
}
