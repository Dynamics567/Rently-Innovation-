import { MigrationInterface, QueryRunner } from 'typeorm';

/** Backs the forgot-password flow — see AuthService.requestPasswordReset/resetPassword. */
export class CreatePasswordResetTokens1720100000000 implements MigrationInterface {
  name = 'CreatePasswordResetTokens1720100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "password_reset_tokens" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "token_hash" text NOT NULL,
        "expires_at" timestamptz NOT NULL,
        "used_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz
      );
      CREATE UNIQUE INDEX "uq_password_reset_tokens_token_hash" ON "password_reset_tokens" ("token_hash");
      CREATE INDEX "ix_password_reset_tokens_user_id" ON "password_reset_tokens" ("user_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "password_reset_tokens"`);
  }
}
