import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Hand-authored rather than `migration:generate`-produced, so the extension
 * setup (needed before any entity migration can run) is explicit and
 * reviewable. Every table from here on is reviewable diff, never
 * `synchronize: true` — see docs/ARCHITECTURE.md and database.module.ts.
 */
export class InitIdentitySchema1719800000000 implements MigrationInterface {
  name = 'InitIdentitySchema1719800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`); // gen_random_uuid()
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "citext"`); // case-insensitive email
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "btree_gist"`); // booking EXCLUDE constraints (see BookingModule migration)
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "postgis"`); // listing geo search (see CatalogModule migration)

    await queryRunner.query(`
      CREATE TYPE "user_role_enum" AS ENUM ('renter','provider','provider_staff','admin','super_admin');
      CREATE TYPE "user_account_status_enum" AS ENUM ('active','suspended','banned');
      CREATE TYPE "provider_verification_status_enum" AS ENUM ('unverified','pending','verified','rejected');
      CREATE TYPE "payout_schedule_enum" AS ENUM ('weekly','on_completion');
      CREATE TYPE "verification_document_type_enum" AS ENUM ('id_card','cac_certificate','proof_of_address','liveness_video');
      CREATE TYPE "verification_document_status_enum" AS ENUM ('pending','approved','rejected');
    `);

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "email" citext,
        "phone" text,
        "password_hash" text,
        "full_name" text NOT NULL,
        "roles" user_role_enum[] NOT NULL DEFAULT '{renter}',
        "email_verified_at" timestamptz,
        "phone_verified_at" timestamptz,
        "status" user_account_status_enum NOT NULL DEFAULT 'active',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz
      );
      CREATE UNIQUE INDEX "uq_users_email" ON "users" ("email") WHERE "email" IS NOT NULL;
      CREATE UNIQUE INDEX "uq_users_phone" ON "users" ("phone") WHERE "phone" IS NOT NULL;
    `);

    await queryRunner.query(`
      CREATE TABLE "provider_profiles" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
        "business_name" text,
        "business_registration_no" text,
        "verification_status" provider_verification_status_enum NOT NULL DEFAULT 'unverified',
        "verification_notes" text,
        "avg_response_time_minutes" int NOT NULL DEFAULT 0,
        "avg_rating" numeric(2,1) NOT NULL DEFAULT 0,
        "total_completed_bookings" int NOT NULL DEFAULT 0,
        "payout_schedule" payout_schedule_enum NOT NULL DEFAULT 'on_completion',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz
      );
      CREATE INDEX "ix_provider_profiles_verification_status" ON "provider_profiles" ("verification_status");
    `);

    await queryRunner.query(`
      CREATE TABLE "verification_documents" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "provider_id" uuid NOT NULL REFERENCES "provider_profiles"("id") ON DELETE CASCADE,
        "doc_type" verification_document_type_enum NOT NULL,
        "storage_key" text NOT NULL,
        "status" verification_document_status_enum NOT NULL DEFAULT 'pending',
        "reviewed_by" uuid,
        "reviewed_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "refresh_tokens" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "token_hash" text NOT NULL,
        "expires_at" timestamptz NOT NULL,
        "revoked_at" timestamptz,
        "replaced_by_token_id" uuid,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz
      );
      CREATE UNIQUE INDEX "uq_refresh_tokens_token_hash" ON "refresh_tokens" ("token_hash");
      CREATE INDEX "ix_refresh_tokens_user_id" ON "refresh_tokens" ("user_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "refresh_tokens"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "verification_documents"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "provider_profiles"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
    await queryRunner.query(`
      DROP TYPE IF EXISTS "verification_document_status_enum";
      DROP TYPE IF EXISTS "verification_document_type_enum";
      DROP TYPE IF EXISTS "payout_schedule_enum";
      DROP TYPE IF EXISTS "provider_verification_status_enum";
      DROP TYPE IF EXISTS "user_account_status_enum";
      DROP TYPE IF EXISTS "user_role_enum";
    `);
  }
}
