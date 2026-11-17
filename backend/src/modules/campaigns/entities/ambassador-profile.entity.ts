import { Column, Entity } from 'typeorm';
import { BaseEntity } from '@common/base/base.entity';
import { AmbassadorStatus } from '../enums/ambassador-status.enum';

/**
 * Layers onto an existing User the same way ProviderProfile does — no
 * parallel identity system. `userId` is a bare FK column, not a TypeORM
 * relation, per the module-boundary rule (Identity's internals are never
 * imported elsewhere; see identity.module.ts's own doc comment).
 */
@Entity('ambassador_profiles')
export class AmbassadorProfile extends BaseEntity {
  @Column({ name: 'user_id' })
  userId: string;

  @Column({
    type: 'enum',
    enum: AmbassadorStatus,
    default: AmbassadorStatus.PENDING,
  })
  status: AmbassadorStatus;

  @Column({ name: 'referral_code', type: 'text' })
  referralCode: string;

  @Column({ name: 'agreement_accepted_at', type: 'timestamptz' })
  agreementAcceptedAt: Date;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt?: Date | null;

  @Column({ name: 'approved_by_admin_id', type: 'uuid', nullable: true })
  approvedByAdminId?: string | null;

  @Column({ name: 'suspended_at', type: 'timestamptz', nullable: true })
  suspendedAt?: Date | null;

  @Column({ name: 'suspended_reason', type: 'text', nullable: true })
  suspendedReason?: string | null;

  @Column({ name: 'disqualified_at', type: 'timestamptz', nullable: true })
  disqualifiedAt?: Date | null;

  @Column({ name: 'disqualified_reason', type: 'text', nullable: true })
  disqualifiedReason?: string | null;

  isActionable(): boolean {
    return this.status !== AmbassadorStatus.DISQUALIFIED;
  }
}
