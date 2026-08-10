import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '@common/base/base.entity';
import { Listing } from './listing.entity';

/**
 * A provider manually blocking dates (maintenance, personal use) — distinct
 * from booking-driven blocks. `during` is a Postgres `tstzrange`, used only
 * for the overlap query/constraint (see AvailabilityService); `startsAt`/
 * `endsAt` duplicate the same interval as plain timestamptz columns so the
 * rest of the app never has to parse Postgres range literal syntax.
 */
@Entity('availability_blocks')
@Index(['listingId'])
export class AvailabilityBlock extends BaseEntity {
  @ManyToOne(() => Listing, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'listing_id' })
  listing: Listing;

  @Column({ name: 'listing_id' })
  listingId: string;

  @Column({ type: 'tstzrange' })
  during: string;

  @Column({ name: 'starts_at', type: 'timestamptz' })
  startsAt: Date;

  @Column({ name: 'ends_at', type: 'timestamptz' })
  endsAt: Date;

  @Column({ type: 'text', nullable: true })
  reason?: string | null;
}
