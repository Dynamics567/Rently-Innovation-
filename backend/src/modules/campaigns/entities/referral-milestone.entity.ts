import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@common/base/base.entity';
import { ReferralMilestoneType } from '../enums/referral-milestone-type.enum';

/**
 * Pure onboarding-progress tracking (brief §8) — no points column. Points
 * land in Phase 3, where PointsLedgerEntry gets inserted alongside a new
 * row here, modeled on finance's append-only Transaction ledger. The
 * unique index on (attribution, type) is what makes "a milestone must only
 * be awarded once per referral" (brief §7) a DB guarantee, not just app logic.
 */
@Entity('referral_milestones')
@Index('ux_referral_milestones_attribution_type', ['referralAttributionId', 'milestoneType'], { unique: true })
export class ReferralMilestone extends BaseEntity {
  @Column({ name: 'referral_attribution_id' })
  referralAttributionId: string;

  @Column({ name: 'milestone_type', type: 'enum', enum: ReferralMilestoneType })
  milestoneType: ReferralMilestoneType;

  @Column({ name: 'achieved_at', type: 'timestamptz' })
  achievedAt: Date;
}
