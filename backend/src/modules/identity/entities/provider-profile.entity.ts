import { Column, Entity, JoinColumn, OneToMany, OneToOne } from 'typeorm';
import { BaseEntity } from '@common/base/base.entity';
import { ProviderVerificationStatus, PayoutSchedule } from '../enums/verification-status.enum';
import { User } from './user.entity';
import { VerificationDocument } from './verification-document.entity';

@Entity('provider_profiles')
export class ProviderProfile extends BaseEntity {
  @OneToOne(() => User, (user) => user.providerProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'business_name', type: 'text', nullable: true })
  businessName?: string;

  @Column({ name: 'business_registration_no', type: 'text', nullable: true })
  businessRegistrationNo?: string;

  @Column({
    name: 'verification_status',
    type: 'enum',
    enum: ProviderVerificationStatus,
    default: ProviderVerificationStatus.UNVERIFIED,
  })
  verificationStatus: ProviderVerificationStatus;

  @Column({ name: 'verification_notes', type: 'text', nullable: true })
  verificationNotes?: string | null;

  // Denormalized read-model fields — recomputed by the Trust & Safety and
  // Booking modules on write, never mutated directly by this module. See
  // docs/DATABASE_SCHEMA.md for why these are safe to denormalize.
  @Column({ name: 'avg_response_time_minutes', type: 'int', default: 0 })
  avgResponseTimeMinutes: number;

  @Column({ name: 'avg_rating', type: 'numeric', precision: 2, scale: 1, default: 0 })
  avgRating: number;

  @Column({ name: 'total_completed_bookings', type: 'int', default: 0 })
  totalCompletedBookings: number;

  @Column({
    name: 'payout_schedule',
    type: 'enum',
    enum: PayoutSchedule,
    default: PayoutSchedule.ON_COMPLETION,
  })
  payoutSchedule: PayoutSchedule;

  @OneToMany(() => VerificationDocument, (doc) => doc.provider)
  verificationDocuments: VerificationDocument[];

  isVerified(): boolean {
    return this.verificationStatus === ProviderVerificationStatus.VERIFIED;
  }
}
