import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@common/base/base.entity';
import { PointsLedgerEntryType } from '../enums/points-ledger-entry-type.enum';

/**
 * Append-only, modeled directly on finance's Transaction entity: a balance
 * is never stored here, only ever `SUM(pointsDelta)` on demand (see
 * PointsLedgerRepository.getBalance()) — same "nothing is ever mutated
 * after insert" invariant, same reasoning (auditability, no read-modify-
 * write race between two milestones landing for the same ambassador at
 * once).
 */
@Entity('points_ledger_entries')
@Index('ix_points_ledger_entries_ambassador_id', ['ambassadorId'])
export class PointsLedgerEntry extends BaseEntity {
  @Column({ name: 'ambassador_id' })
  ambassadorId: string;

  @Column({ type: 'enum', enum: PointsLedgerEntryType })
  type: PointsLedgerEntryType;

  @Column({ name: 'points_delta', type: 'int' })
  pointsDelta: number;

  /** Polymorphic pointer, e.g. {'ReferralMilestone', milestone.id} — same convention as Transaction's bookingId/disputeId columns, just generic since this ledger has more than one source type. */
  @Column({ name: 'source_entity_type', type: 'text', nullable: true })
  sourceEntityType?: string | null;

  @Column({ name: 'source_entity_id', type: 'uuid', nullable: true })
  sourceEntityId?: string | null;

  @Column({ type: 'text', nullable: true })
  reason?: string | null;

  @Column({ name: 'created_by_admin_id', type: 'uuid', nullable: true })
  createdByAdminId?: string | null;
}
