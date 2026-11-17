import { Column, Entity } from 'typeorm';
import { BaseEntity } from '@common/base/base.entity';
import { ReferralSource } from '../enums/referral-source.enum';
import { ReferralStatus } from '../enums/referral-status.enum';

/**
 * One row per referred person, `referredUserId` unique — brief §6 rule 1:
 * a new Rental Partner must only be attributed to one ambassador, ever.
 */
@Entity('referral_attributions')
export class ReferralAttribution extends BaseEntity {
  @Column({ name: 'ambassador_id' })
  ambassadorId: string;

  @Column({ name: 'referred_user_id' })
  referredUserId: string;

  /** Denormalized copy of the code used at the time, for audit — AmbassadorProfile.referralCode can change later without rewriting history. */
  @Column({ name: 'referral_code', type: 'text' })
  referralCode: string;

  @Column({ type: 'enum', enum: ReferralSource })
  source: ReferralSource;

  @Column({ name: 'attributed_by_admin_id', type: 'uuid', nullable: true })
  attributedByAdminId?: string | null;

  @Column({
    type: 'enum',
    enum: ReferralStatus,
    default: ReferralStatus.PENDING,
  })
  status: ReferralStatus;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason?: string | null;
}
