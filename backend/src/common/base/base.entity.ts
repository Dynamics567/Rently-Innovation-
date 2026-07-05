import { CreateDateColumn, DeleteDateColumn, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/**
 * Every persisted entity gets a UUID PK and audit timestamps for free.
 * `deletedAt` backs TypeORM's soft-delete (`softRemove`/`@DeleteDateColumn`) —
 * required by PRD auditability: nothing a user or provider creates is ever
 * hard-deleted, only marked gone, so the audit trail stays intact.
 */
export abstract class BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz', name: 'deleted_at', nullable: true })
  deletedAt?: Date | null;
}
