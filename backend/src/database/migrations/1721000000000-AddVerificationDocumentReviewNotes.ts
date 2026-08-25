import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `verification_documents` has existed since the original identity
 * migration but nothing ever wrote or read rows in it — see
 * VerificationDocumentsService. `review_notes` records why a specific
 * document was rejected (or any note on approval), distinct from
 * ProviderProfile.verificationNotes which is about the whole-profile
 * verification decision.
 */
export class AddVerificationDocumentReviewNotes1721000000000 implements MigrationInterface {
  name = 'AddVerificationDocumentReviewNotes1721000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "verification_documents" ADD COLUMN "review_notes" text;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "verification_documents" DROP COLUMN IF EXISTS "review_notes";
    `);
  }
}
