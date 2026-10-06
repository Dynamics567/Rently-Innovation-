import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Lets a super admin grant admin/super_admin access to an email that
 * doesn't have an account yet — the invite is honored at signup time (see
 * AuthService.signup()'s inviteToken handling) rather than requiring the
 * person to sign up first and be found afterward. For an email that
 * already has an account, no row here is needed at all — the grant is
 * immediate (see UsersService.inviteAdmin()). `citext` is already enabled
 * (users.email uses it); reused here for the same case-insensitive match.
 */
export class CreateAdminInvites1721400000000 implements MigrationInterface {
  name = 'CreateAdminInvites1721400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "admin_invites_role_enum" AS ENUM ('admin', 'super_admin');`);
    await queryRunner.query(`
      CREATE TABLE "admin_invites" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "email" citext NOT NULL,
        "token_hash" text NOT NULL,
        "role" "admin_invites_role_enum" NOT NULL,
        "invited_by_user_id" uuid NOT NULL REFERENCES "users"("id"),
        "expires_at" timestamptz NOT NULL,
        "accepted_at" timestamptz,
        "revoked_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz
      );
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX "ux_admin_invites_token_hash" ON "admin_invites" ("token_hash");`);
    await queryRunner.query(`CREATE INDEX "ix_admin_invites_email" ON "admin_invites" ("email");`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "admin_invites"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "admin_invites_role_enum"`);
  }
}
