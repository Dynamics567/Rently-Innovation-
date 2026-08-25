import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '@common/base/base.entity';
import { Listing } from './listing.entity';
import { AssetProviderStatus, ListingCondition } from '../enums/listing.enums';

/**
 * One physical unit of a listing — a provider with 5 identical chairs adds
 * 5 Asset rows under one Listing instead of 5 separate listings. A listing
 * with zero Asset rows behaves exactly as before this feature existed
 * (implicit single unit, Booking.assetId stays null) — fully backward
 * compatible, no data migration needed for existing listings.
 */
@Entity('assets')
@Index(['listingId'])
export class Asset extends BaseEntity {
  @ManyToOne(() => Listing, (listing) => listing.assets, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'listing_id' })
  listing: Listing;

  @Column({ name: 'listing_id' })
  listingId: string;

  @Column({ type: 'text' })
  label: string;

  @Column({ type: 'enum', enum: ListingCondition, default: ListingCondition.GOOD })
  condition: ListingCondition;

  @Column({
    name: 'provider_status',
    type: 'enum',
    enum: AssetProviderStatus,
    default: AssetProviderStatus.ACTIVE,
  })
  providerStatus: AssetProviderStatus;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;
}
