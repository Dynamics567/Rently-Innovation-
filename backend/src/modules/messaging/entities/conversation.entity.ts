import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@common/base/base.entity';

/**
 * Bare FK columns only (bookingId/renterId/providerUserId), never a
 * @ManyToOne into Booking or User — MessagingModule reads BookingService's
 * exported methods to resolve those ids, it never imports Booking/Identity
 * entities directly. See the module-boundary rule in docs/ARCHITECTURE.md §1.
 */
@Entity('conversations')
export class Conversation extends BaseEntity {
  @Index({ unique: true })
  @Column({ name: 'booking_id' })
  bookingId: string;

  @Column({ name: 'renter_id' })
  renterId: string;

  @Column({ name: 'provider_user_id' })
  providerUserId: string;
}
