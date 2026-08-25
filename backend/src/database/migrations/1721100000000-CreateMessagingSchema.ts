import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Minimal booking-scoped messaging (item 9 of the Product Depth Audit
 * closure plan). A Conversation is lazily created on a booking's first
 * message rather than at booking creation, so bookings that never need to
 * message leave no orphan row. One conversation per booking, enforced with
 * a UNIQUE constraint rather than a lookup-then-insert race.
 */
export class CreateMessagingSchema1721100000000 implements MigrationInterface {
  name = 'CreateMessagingSchema1721100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "conversations" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "booking_id" uuid NOT NULL UNIQUE REFERENCES "bookings"("id") ON DELETE CASCADE,
        "renter_id" uuid NOT NULL REFERENCES "users"("id"),
        "provider_user_id" uuid NOT NULL REFERENCES "users"("id"),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz
      );
    `);
    await queryRunner.query(`
      CREATE TABLE "messages" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "conversation_id" uuid NOT NULL REFERENCES "conversations"("id") ON DELETE CASCADE,
        "sender_id" uuid NOT NULL REFERENCES "users"("id"),
        "body" text NOT NULL,
        "read_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz
      );
      CREATE INDEX "ix_messages_conversation" ON "messages" ("conversation_id", "created_at");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "messages"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "conversations"`);
  }
}
