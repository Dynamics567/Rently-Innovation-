import { Column, Entity } from 'typeorm';
import { BaseEntity } from '@common/base/base.entity';

/**
 * What SignupReferralListener's catch block used to just log and discard
 * (see its own history) — every basic-fraud rejection from
 * ReferralAttributionService.attribute() (self-referral, duplicate
 * attribution, existing-provider referral, unknown code) now lands here
 * instead, so brief §14's fraud-review screen has something real to show.
 * Never blocks the signup itself — this is purely a review record.
 */
@Entity('referral_fraud_flags')
export class ReferralFraudFlag extends BaseEntity {
  @Column({ name: 'referral_code', type: 'text', nullable: true })
  referralCode?: string | null;

  @Column({ name: 'attempted_user_id', type: 'uuid' })
  attemptedUserId: string;

  @Column({ name: 'reason_code', type: 'text' })
  reasonCode: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ name: 'acknowledged_at', type: 'timestamptz', nullable: true })
  acknowledgedAt?: Date | null;

  @Column({ name: 'acknowledged_by_admin_id', type: 'uuid', nullable: true })
  acknowledgedByAdminId?: string | null;
}
