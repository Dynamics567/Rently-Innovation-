import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '@common/base/base.entity';
import { Listing } from './listing.entity';

@Entity('listing_photos')
@Index(['listingId', 'position'])
export class ListingPhoto extends BaseEntity {
  @ManyToOne(() => Listing, (listing) => listing.photos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'listing_id' })
  listing: Listing;

  @Column({ name: 'listing_id' })
  listingId: string;

  /** Object storage key — resolved to a URL via StoragePort.getUrl() at read time, never persisted as a URL. */
  @Column({ name: 'storage_key', type: 'text' })
  storageKey: string;

  @Column({ type: 'int', default: 0 })
  position: number;
}
