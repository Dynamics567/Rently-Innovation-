import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNotificationsSchema1720500000000 implements MigrationInterface {
  name = 'CreateNotificationsSchema1720500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "notification_type_enum" AS ENUM (
        'booking_created','booking_approved','booking_declined','booking_cancelled',
        'booking_handed_over','booking_returned','booking_deposit_released','booking_disputed',
        'booking_extension_requested','booking_extension_resolved',
        'provider_verified','provider_rejected','listing_approved','listing_rejected',
        'verification_document_reviewed','message_received'
      );
      CREATE TYPE "notification_channel_enum" AS ENUM ('in_app','email');
    `);
    await queryRunner.query(`
      CREATE TABLE "notifications" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "recipient_id" uuid NOT NULL REFERENCES "users"("id"),
        "type" notification_type_enum NOT NULL,
        "payload" jsonb NOT NULL DEFAULT '{}',
        "channel" notification_channel_enum NOT NULL,
        "read_at" timestamptz,
        "sent_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz
      );
      CREATE INDEX "ix_notifications_recipient_read" ON "notifications" ("recipient_id", "read_at");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "notifications"`);
    await queryRunner.query(`
      DROP TYPE IF EXISTS "notification_channel_enum";
      DROP TYPE IF EXISTS "notification_type_enum";
    `);
  }
}
