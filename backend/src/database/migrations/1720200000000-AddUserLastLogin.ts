import { MigrationInterface, QueryRunner } from 'typeorm';

/** Backs dashboard personalization (new/returning-user copy) — see AuthService.login(). */
export class AddUserLastLogin1720200000000 implements MigrationInterface {
  name = 'AddUserLastLogin1720200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users" ADD COLUMN "last_login_at" timestamptz;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "last_login_at"`);
  }
}
