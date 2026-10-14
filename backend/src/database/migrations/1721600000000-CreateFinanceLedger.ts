import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Turns the real charge/refund/release events PaymentPort already produces
 * on every booking into a permanent, queryable ledger — see FinanceService's
 * doc comment and the Phase E plan for the full rationale. No real payment
 * processor is integrated yet (deliberate scope decision): `settlements` is
 * a manual bookkeeping record (an admin recording an off-platform payout),
 * never a simulated automated one.
 *
 * `settlements` is created before `transactions` because `transactions.settlement_id`
 * references it — reverse that order in `down()`.
 *
 * Backfills real historical transactions from existing bookings/disputes/
 * extension-requests so the ledger isn't blank on day one — see each INSERT's
 * comment for exactly what it reconstructs and why. Deliberately does NOT
 * backfill REFUND rows for historical cancellations: the exact refunded
 * amount for a past cancellation was never persisted anywhere
 * (`previewCancellationRefund()` computes it on the fly), and recomputing it
 * now risks fabricating a number that doesn't match what actually happened
 * if the cancellation-policy logic has changed at all since. Every
 * cancellation from this migration forward gets a real, exact REFUND row via
 * BookingService.cancel()'s new FinanceService call — only pre-Phase-E
 * historical cancellations are left absent from the ledger.
 *
 * Also extends Phase D's permission set with `finance.view`/`finance.settle`
 * and grants them to the roles its own migration already predicted would
 * need them (Finance Admin; Analyst/Auditor, seeded as "every .view
 * permission" by explicit design intent; Full Admin).
 */
export class CreateFinanceLedger1721600000000 implements MigrationInterface {
  name = 'CreateFinanceLedger1721600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "settlements" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "provider_id" uuid NOT NULL REFERENCES "provider_profiles"("id"),
        "total_minor" bigint NOT NULL,
        "status" text NOT NULL DEFAULT 'pending',
        "paid_at" timestamptz,
        "paid_reference" text,
        "paid_by_admin_id" uuid REFERENCES "users"("id"),
        "created_by_admin_id" uuid NOT NULL REFERENCES "users"("id"),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz
      );
    `);
    await queryRunner.query(`CREATE INDEX "ix_settlements_provider" ON "settlements" ("provider_id");`);

    await queryRunner.query(`
      CREATE TABLE "transactions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "booking_id" uuid NOT NULL REFERENCES "bookings"("id"),
        "type" text NOT NULL,
        "amount_minor" bigint NOT NULL,
        "renter_id" uuid REFERENCES "users"("id"),
        "provider_id" uuid REFERENCES "provider_profiles"("id"),
        "dispute_id" uuid REFERENCES "disputes"("id"),
        "settlement_id" uuid REFERENCES "settlements"("id"),
        "payment_reference" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz
      );
    `);
    await queryRunner.query(`CREATE INDEX "ix_transactions_booking" ON "transactions" ("booking_id");`);
    await queryRunner.query(`CREATE INDEX "ix_transactions_provider" ON "transactions" ("provider_id");`);
    await queryRunner.query(`CREATE INDEX "ix_transactions_settlement" ON "transactions" ("settlement_id");`);

    // ---- backfill: original charge per booking, net of any approved extension's own charge (backfilled separately below) ----
    await queryRunner.query(`
      INSERT INTO "transactions" ("booking_id", "type", "amount_minor", "renter_id", "payment_reference", "created_at")
      SELECT
        b."id",
        'charge',
        b."total_minor" - COALESCE((
          SELECT SUM(er."additional_rental_fee_minor" + er."additional_service_fee_minor")
          FROM "booking_extension_requests" er
          WHERE er."booking_id" = b."id" AND er."status" = 'approved'
        ), 0),
        b."renter_id",
        b."payment_reference",
        b."updated_at"
      FROM "bookings" b
      WHERE b."payment_reference" IS NOT NULL;
    `);

    // ---- backfill: each approved extension's own charge, as its own real event ----
    await queryRunner.query(`
      INSERT INTO "transactions" ("booking_id", "type", "amount_minor", "renter_id", "created_at")
      SELECT er."booking_id", 'charge', (er."additional_rental_fee_minor" + er."additional_service_fee_minor"), b."renter_id", er."decided_at"
      FROM "booking_extension_requests" er
      JOIN "bookings" b ON b."id" = er."booking_id"
      WHERE er."status" = 'approved' AND er."decided_at" IS NOT NULL
        AND (er."additional_rental_fee_minor" + er."additional_service_fee_minor") > 0;
    `);

    // ---- backfill: deposit release + provider earning for bookings completed via a clean (undisputed) return ----
    await queryRunner.query(`
      INSERT INTO "transactions" ("booking_id", "type", "amount_minor", "renter_id", "created_at")
      SELECT b."id", 'deposit_release', b."deposit_minor", b."renter_id", b."updated_at"
      FROM "bookings" b
      WHERE b."status" = 'completed'
        AND b."deposit_minor" > 0
        AND NOT EXISTS (SELECT 1 FROM "disputes" d WHERE d."booking_id" = b."id");
    `);
    await queryRunner.query(`
      INSERT INTO "transactions" ("booking_id", "type", "amount_minor", "provider_id", "created_at")
      SELECT b."id", 'provider_earning', b."rental_fee_minor", l."provider_id", b."updated_at"
      FROM "bookings" b
      JOIN "listings" l ON l."id" = b."listing_id"
      WHERE b."status" = 'completed'
        AND b."rental_fee_minor" > 0
        AND NOT EXISTS (SELECT 1 FROM "disputes" d WHERE d."booking_id" = b."id");
    `);

    // ---- backfill: deposit release (net of deduction) + provider forfeit credit + provider earning for resolved disputes ----
    await queryRunner.query(`
      INSERT INTO "transactions" ("booking_id", "type", "amount_minor", "renter_id", "dispute_id", "created_at")
      SELECT b."id", 'deposit_release', (b."deposit_minor" - COALESCE(d."final_deduction_minor", 0)), b."renter_id", d."id", d."resolved_at"
      FROM "disputes" d
      JOIN "bookings" b ON b."id" = d."booking_id"
      WHERE d."status" = 'resolved' AND (b."deposit_minor" - COALESCE(d."final_deduction_minor", 0)) > 0;
    `);
    await queryRunner.query(`
      INSERT INTO "transactions" ("booking_id", "type", "amount_minor", "provider_id", "dispute_id", "created_at")
      SELECT b."id", 'provider_forfeit_credit', d."final_deduction_minor", l."provider_id", d."id", d."resolved_at"
      FROM "disputes" d
      JOIN "bookings" b ON b."id" = d."booking_id"
      JOIN "listings" l ON l."id" = b."listing_id"
      WHERE d."status" = 'resolved' AND COALESCE(d."final_deduction_minor", 0) > 0;
    `);
    await queryRunner.query(`
      INSERT INTO "transactions" ("booking_id", "type", "amount_minor", "provider_id", "dispute_id", "created_at")
      SELECT b."id", 'provider_earning', b."rental_fee_minor", l."provider_id", d."id", d."resolved_at"
      FROM "disputes" d
      JOIN "bookings" b ON b."id" = d."booking_id"
      JOIN "listings" l ON l."id" = b."listing_id"
      WHERE d."status" = 'resolved' AND b."rental_fee_minor" > 0;
    `);

    // ---- extend Phase D's permission set ----
    await queryRunner.query(`
      INSERT INTO "permissions" ("key", "label", "module") VALUES
        ('finance.view', 'View transactions, wallets and settlements', 'Finance'),
        ('finance.settle', 'Create and mark settlements paid', 'Finance');
    `);
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
    await grant('finance-admin', ['finance.view', 'finance.settle']);
    // Analyst/Auditor were seeded in Phase D as "every .view permission" by explicit design intent — this extends that to Finance's new view.
    await grant('analyst', ['finance.view']);
    await grant('auditor', ['finance.view']);
    await grant('full-admin', ['finance.view', 'finance.settle']);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "permissions" WHERE "key" IN ('finance.view', 'finance.settle')`);
    await queryRunner.query(`DROP TABLE IF EXISTS "transactions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "settlements"`);
  }
}
