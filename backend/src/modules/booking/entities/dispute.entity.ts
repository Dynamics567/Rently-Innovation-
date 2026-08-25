import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@common/base/base.entity';
import { BigIntNumberTransformer } from '@common/transformers/bigint-number.transformer';
import { DisputeStatus } from '../enums/dispute-status.enum';
import { DisputeResolution } from '../enums/dispute-resolution.enum';

/**
 * One dispute per booking in this MVP scope — no reopening once resolved.
 * Lives inside BookingModule (not a separate Trust module) because
 * resolving a dispute must call back into BookingService to finalize the
 * booking (adjust deposit, advance to depositreleased/completed); a
 * separate module would need BookingModule for that finalization while
 * BookingModule would need it back to open disputes — a circular
 * dependency reviews (one-directional) don't run into.
 */
@Entity('disputes')
@Index(['bookingId'], { unique: true })
export class Dispute extends BaseEntity {
  @Column({ name: 'booking_id' })
  bookingId: string;

  @Column({ name: 'opened_by' })
  openedBy: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ name: 'evidence_keys', type: 'text', array: true, default: '{}' })
  evidenceKeys: string[];

  @Column({ type: 'enum', enum: DisputeStatus, default: DisputeStatus.OPEN })
  status: DisputeStatus;

  @Column({
    name: 'proposed_deduction_minor',
    type: 'bigint',
    nullable: true,
    transformer: BigIntNumberTransformer,
  })
  proposedDeductionMinor?: number | null;

  @Column({ name: 'proposed_by', type: 'uuid', nullable: true })
  proposedBy?: string | null;

  @Column({ name: 'proposed_at', type: 'timestamptz', nullable: true })
  proposedAt?: Date | null;

  @Column({ name: 'proposal_note', type: 'text', nullable: true })
  proposalNote?: string | null;

  @Column({
    name: 'final_deduction_minor',
    type: 'bigint',
    nullable: true,
    transformer: BigIntNumberTransformer,
  })
  finalDeductionMinor?: number | null;

  @Column({ type: 'enum', enum: DisputeResolution, nullable: true })
  resolution?: DisputeResolution | null;

  @Column({ name: 'resolved_by', type: 'uuid', nullable: true })
  resolvedBy?: string | null;

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt?: Date | null;

  @Column({ name: 'resolution_note', type: 'text', nullable: true })
  resolutionNote?: string | null;
}
