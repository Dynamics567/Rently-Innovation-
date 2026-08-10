import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@common/base/base.entity';
import { BigIntNumberTransformer } from '@common/transformers/bigint-number.transformer';
import { BookingMode, CancellationPolicy } from '@modules/catalog/enums/listing.enums';
import { BookingStage, BookingStatus } from '../enums/booking.enums';

/**
 * `listingId`/`renterId` are bare columns, not relations — Booking never
 * imports Catalog's `Listing` or Identity's `User` entities directly
 * (module-boundary rule). Cross-module reads happen through
 * ListingsService/ProviderProfileService.
 *
 * `during` (tstzrange) backs the `no_overlapping_bookings` EXCLUDE
 * constraint (see the migration) and is otherwise write-only; `startsAt`/
 * `endsAt` duplicate the same interval as plain timestamptz columns for
 * everything else, same pattern as AvailabilityBlock.
 *
 * `rentalFeeMinor`/`serviceFeeMinor`/`depositMinor` are snapshotted at
 * booking time — a provider changing their price tomorrow must never change
 * what a renter agreed to pay for last week's booking.
 */
@Entity('bookings')
@Index(['renterId'])
@Index(['listingId'])
export class Booking extends BaseEntity {
  @Column({ name: 'listing_id' })
  listingId: string;

  @Column({ name: 'renter_id' })
  renterId: string;

  @Column({ type: 'tstzrange' })
  during: string;

  @Column({ name: 'starts_at', type: 'timestamptz' })
  startsAt: Date;

  @Column({ name: 'ends_at', type: 'timestamptz' })
  endsAt: Date;

  @Column({ type: 'enum', enum: BookingStatus, default: BookingStatus.PENDING })
  status: BookingStatus;

  @Column({ type: 'enum', enum: BookingStage, default: BookingStage.REQUESTED })
  stage: BookingStage;

  @Column({ name: 'booking_mode', type: 'enum', enum: BookingMode })
  bookingMode: BookingMode;

  @Column({ name: 'rental_fee_minor', type: 'bigint', transformer: BigIntNumberTransformer })
  rentalFeeMinor: number;

  @Column({ name: 'service_fee_minor', type: 'bigint', transformer: BigIntNumberTransformer })
  serviceFeeMinor: number;

  @Column({
    name: 'deposit_minor',
    type: 'bigint',
    default: 0,
    transformer: BigIntNumberTransformer,
  })
  depositMinor: number;

  @Column({ name: 'total_minor', type: 'bigint', transformer: BigIntNumberTransformer })
  totalMinor: number;

  @Column({ name: 'cancellation_policy', type: 'enum', enum: CancellationPolicy })
  cancellationPolicy: CancellationPolicy;

  @Index({ unique: true, where: '"idempotency_key" IS NOT NULL' })
  @Column({ name: 'idempotency_key', type: 'text', nullable: true })
  idempotencyKey?: string | null;

  @Column({ name: 'payment_reference', type: 'text', nullable: true })
  paymentReference?: string | null;

  isBeforePickup(): boolean {
    return [
      BookingStage.REQUESTED,
      BookingStage.ACCEPTED,
      BookingStage.PAYMENT,
      BookingStage.RESERVED,
      BookingStage.READY,
    ].includes(this.stage);
  }
}
