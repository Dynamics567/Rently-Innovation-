import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@common/base/base.entity';
import { ReviewDirection } from '../enums/review-direction.enum';
import { ReviewStatus } from '../enums/review-status.enum';

/**
 * `bookingId`/`listingId`/`authorId`/`targetId` are bare columns, not
 * relations — Trust never imports Booking/Catalog/Identity entities
 * directly (module-boundary rule). `listingId` is snapshotted from the
 * booking at write time so `GET /listings/:id/reviews` never needs to read
 * through Booking. Unique on (bookingId, direction): one review per
 * direction per booking, enforced at the DB level.
 */
@Entity('reviews')
@Index(['bookingId', 'direction'], { unique: true })
@Index(['listingId'])
@Index(['targetId'])
export class Review extends BaseEntity {
  @Column({ name: 'booking_id' })
  bookingId: string;

  @Column({ name: 'listing_id' })
  listingId: string;

  @Column({ name: 'author_id' })
  authorId: string;

  @Column({ name: 'target_id' })
  targetId: string;

  @Column({ type: 'enum', enum: ReviewDirection })
  direction: ReviewDirection;

  @Column({ type: 'smallint' })
  rating: number;

  @Column({ type: 'text', nullable: true })
  comment?: string | null;

  @Column({ name: 'provider_response', type: 'text', nullable: true })
  providerResponse?: string | null;

  @Column({ type: 'enum', enum: ReviewStatus, default: ReviewStatus.VISIBLE })
  status: ReviewStatus;

  @Column({ name: 'moderated_by', type: 'uuid', nullable: true })
  moderatedBy?: string | null;

  @Column({ name: 'moderated_at', type: 'timestamptz', nullable: true })
  moderatedAt?: Date | null;

  @Column({ name: 'moderation_reason', type: 'text', nullable: true })
  moderationReason?: string | null;
}
