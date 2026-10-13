import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Granular Module→Action→Permission RBAC, additive on top of the existing
 * UserRole.ADMIN/SUPER_ADMIN gate (RolesGuard) rather than replacing it —
 * see PermissionsGuard's own doc comment for why. `admin_role_permissions`
 * and `user_admin_roles` are plain join tables (composite-queried, not
 * modeled as TypeORM @ManyToMany) to avoid adding a relation onto the
 * heavily-used User entity — a bare `user_id` column here is enough.
 *
 * Seeds the 13 real permission keys this phase actually wires up, 8 named
 * roles (7 from the brief's Part 14 list + "Full Admin"), their grants, and
 * — the backward-compatibility step — assigns "Full Admin" to every
 * existing user who already has the `admin` role, so nobody loses access
 * the moment this ships. Deliberately data AND schema in one migration:
 * this reference data is fixed and versioned with the tables that define
 * it, not an ad hoc operational script like seeds/promote-user.ts.
 */
export class CreateAdminRbac1721500000000 implements MigrationInterface {
  name = 'CreateAdminRbac1721500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "permissions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "key" text NOT NULL,
        "label" text NOT NULL,
        "module" text NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz
      );
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX "ux_permissions_key" ON "permissions" ("key");`);

    await queryRunner.query(`
      CREATE TABLE "admin_roles" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" text NOT NULL,
        "slug" text NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz
      );
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX "ux_admin_roles_slug" ON "admin_roles" ("slug");`);

    await queryRunner.query(`
      CREATE TABLE "admin_role_permissions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "admin_role_id" uuid NOT NULL REFERENCES "admin_roles"("id") ON DELETE CASCADE,
        "permission_id" uuid NOT NULL REFERENCES "permissions"("id") ON DELETE CASCADE,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz
      );
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX "ux_admin_role_permissions_role_permission" ON "admin_role_permissions" ("admin_role_id", "permission_id");`);
    await queryRunner.query(`CREATE INDEX "ix_admin_role_permissions_role" ON "admin_role_permissions" ("admin_role_id");`);

    await queryRunner.query(`
      CREATE TABLE "user_admin_roles" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "admin_role_id" uuid NOT NULL REFERENCES "admin_roles"("id") ON DELETE CASCADE,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz
      );
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX "ux_user_admin_roles_user_role" ON "user_admin_roles" ("user_id", "admin_role_id");`);
    await queryRunner.query(`CREATE INDEX "ix_user_admin_roles_user" ON "user_admin_roles" ("user_id");`);

    // ---- seed: 13 permissions ----
    await queryRunner.query(`
      INSERT INTO "permissions" ("key", "label", "module") VALUES
        ('bookings.view', 'View bookings', 'Operations'),
        ('disputes.view', 'View disputes', 'Operations'),
        ('disputes.resolve', 'Resolve disputes', 'Operations'),
        ('listings.view', 'View listings', 'Marketplace'),
        ('listings.moderate', 'Approve, reject, pause listings', 'Marketplace'),
        ('providers.view', 'View Rental Partners', 'Marketplace'),
        ('providers.verify', 'Verify Rental Partners', 'Trust & Safety'),
        ('users.view', 'View customers', 'Marketplace'),
        ('users.suspend', 'Suspend or reinstate customers', 'Marketplace'),
        ('reviews.view', 'View reviews', 'Growth'),
        ('reviews.moderate', 'Hide or unhide reviews', 'Growth'),
        ('categories.manage', 'Create and edit categories', 'Marketplace'),
        ('auditlog.view', 'View the audit log', 'Control');
    `);

    // ---- seed: 8 named roles ----
    await queryRunner.query(`
      INSERT INTO "admin_roles" ("name", "slug") VALUES
        ('Operations Admin', 'operations-admin'),
        ('Finance Admin', 'finance-admin'),
        ('Customer Support', 'customer-support'),
        ('Trust & Safety', 'trust-and-safety'),
        ('Content Admin', 'content-admin'),
        ('Analyst', 'analyst'),
        ('Auditor', 'auditor'),
        ('Full Admin', 'full-admin');
    `);

    // ---- seed: role -> permission grants ----
    const grant = async (slug: string, keys: string[]) => {
      await queryRunner.query(
        `
        INSERT INTO "admin_role_permissions" ("admin_role_id", "permission_id")
        SELECT r."id", p."id"
        FROM "admin_roles" r, "permissions" p
        WHERE r."slug" = $1 AND p."key" = ANY($2::text[]);
      `,
        [slug, keys],
      );
    };
    await grant('operations-admin', ['bookings.view', 'disputes.view', 'disputes.resolve', 'listings.view', 'listings.moderate']);
    // Finance Admin: deliberately minimal — no real Finance module exists yet (Phase E).
    await grant('finance-admin', ['bookings.view']);
    await grant('customer-support', ['users.view', 'users.suspend', 'bookings.view', 'disputes.view']);
    await grant('trust-and-safety', ['providers.view', 'providers.verify', 'reviews.view', 'reviews.moderate', 'listings.view']);
    // Content Admin: deliberately minimal — no CMS exists yet (Phase F).
    await grant('content-admin', ['categories.manage']);
    await grant('analyst', ['bookings.view', 'listings.view', 'users.view', 'providers.view', 'reviews.view']);
    await grant('auditor', ['auditlog.view', 'bookings.view', 'listings.view', 'users.view', 'providers.view', 'reviews.view', 'disputes.view']);
    await grant('full-admin', [
      'bookings.view', 'disputes.view', 'disputes.resolve', 'listings.view', 'listings.moderate',
      'providers.view', 'providers.verify', 'users.view', 'users.suspend', 'reviews.view',
      'reviews.moderate', 'categories.manage', 'auditlog.view',
    ]);

    // ---- backward-compat: grandfather every existing `admin` user into Full Admin ----
    await queryRunner.query(`
      INSERT INTO "user_admin_roles" ("user_id", "admin_role_id")
      SELECT u."id", (SELECT "id" FROM "admin_roles" WHERE "slug" = 'full-admin')
      FROM "users" u
      WHERE 'admin' = ANY(u."roles");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "user_admin_roles"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "admin_role_permissions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "admin_roles"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "permissions"`);
  }
}
