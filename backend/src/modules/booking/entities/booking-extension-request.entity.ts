import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@common/base/base.entity';
import { BigIntNumberTransformer } from '@common/transformers/bigint-number.transformer';
import { ExtensionRequestStatus } from '../enums/extension-request-status.enum';

/** A renter's request to push a rental's end date out while it's ACTIVE — see BookingService.requestExtension(). */
@Entity('booking_extension_requests')
@Index(['bookingId'])
export class BookingExtensionRequest extends BaseEntity {
  @Column({ name: 'booking_id' })
  bookingId: string;

  @Column({ name: 'requested_by' })
  requestedBy: string;

  @Column({ name: 'current_ends_at', type: 'timestamptz' })
  currentEndsAt: Date;

  @Column({ name: 'requested_ends_at', type: 'timestamptz' })
  requestedEndsAt: Date;

  @Column({ type: 'enum', enum: ExtensionRequestStatus, default: ExtensionRequestStatus.PENDING })
  status: ExtensionRequestStatus;

  @Column({
    name: 'additional_rental_fee_minor',
    type: 'bigint',
    nullable: true,
    transformer: BigIntNumberTransformer,
  })
  additionalRentalFeeMinor?: number | null;

  @Column({
    name: 'additional_service_fee_minor',
    type: 'bigint',
    nullable: true,
    transformer: BigIntNumberTransformer,
  })
  additionalServiceFeeMinor?: number | null;

  @Column({ name: 'decided_by', type: 'uuid', nullable: true })
  decidedBy?: string | null;

  @Column({ name: 'decided_at', type: 'timestamptz', nullable: true })
  decidedAt?: Date | null;

  @Column({ name: 'decline_reason', type: 'text', nullable: true })
  declineReason?: string | null;
}
