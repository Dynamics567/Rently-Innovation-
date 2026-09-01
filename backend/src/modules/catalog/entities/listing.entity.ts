import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '@common/base/base.entity';
import { BigIntNumberTransformer } from '@common/transformers/bigint-number.transformer';
import { Category } from './category.entity';
import { ListingPhoto } from './listing-photo.entity';
import { Asset } from './asset.entity';
import {
  BookingMode,
  CancellationPolicy,
  ListingCondition,
  ListingStatus,
  PriceUnit,
} from '../enums/listing.enums';

/**
 * `providerId` is a bare column, not a TypeORM relation — Catalog never
 * imports Identity's `ProviderProfile` entity directly (module-boundary rule,
 * docs/ARCHITECTURE.md §1). Anything needing the owning provider's details
 * calls IdentityModule's exported `ProviderProfileService`.
 *
 * `lat`/`lng`/`locationText` replace the docs' PostGIS `geography(Point)`
 * column — see the migration file for why (not available on Railway's
 * managed Postgres). Radius search is a follow-up, not required at this scale.
 */
@Entity('listings')
@Index(['categoryId', 'status'])
export class Listing extends BaseEntity {
  @Column({ name: 'provider_id' })
  providerId: string;

  @ManyToOne(() => Category, { nullable: false })
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @Column({ name: 'category_id' })
  categoryId: string;

  @Column({ type: 'text' })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  attributes: Record<string, unknown>;

  @Column({ name: 'price_minor', type: 'bigint', transformer: BigIntNumberTransformer })
  priceMinor: number;

  @Column({ name: 'price_unit', type: 'enum', enum: PriceUnit })
  priceUnit: PriceUnit;

  @Column({
    name: 'deposit_minor',
    type: 'bigint',
    nullable: true,
    transformer: BigIntNumberTransformer,
  })
  depositMinor?: number | null;

  @Column({ type: 'numeric', precision: 9, scale: 6, nullable: true })
  lat?: number | null;

  @Column({ type: 'numeric', precision: 9, scale: 6, nullable: true })
  lng?: number | null;

  @Column({ name: 'location_text', type: 'text' })
  locationText: string;

  @Column({ type: 'enum', enum: ListingCondition, default: ListingCondition.GOOD })
  condition: ListingCondition;

  @Column({ name: 'min_duration', type: 'int', default: 1 })
  minDuration: number;

  @Column({ name: 'max_duration', type: 'int', nullable: true })
  maxDuration?: number | null;

  @Column({
    name: 'cancellation_policy',
    type: 'enum',
    enum: CancellationPolicy,
    default: CancellationPolicy.MODERATE,
  })
  cancellationPolicy: CancellationPolicy;

  @Column({ name: 'booking_mode', type: 'enum', enum: BookingMode, default: BookingMode.REQUEST })
  bookingMode: BookingMode;

  // Turnaround time a provider needs between one rental ending and the next
  // starting (cleaning, refueling, prep) — per-listing since a car needs
  // meaningfully more than a tent. Applied as padding on both sides of a
  // booking's range when checking for conflicts with other bookings.
  @Column({ name: 'turnaround_buffer_minutes', type: 'int', default: 120 })
  turnaroundBufferMinutes: number;

  // How many identical units the provider has of this listing (e.g. 50
  // chairs) — for fungible/bulk items, distinct from the Asset system below
  // which tracks individually distinguishable units (e.g. specific cars).
  // A listing using Assets ignores this column; it stays at its default 1.
  @Column({ name: 'quantity_available', type: 'int', default: 1 })
  quantityAvailable: number;

  @Column({ type: 'enum', enum: ListingStatus, default: ListingStatus.DRAFT })
  status: ListingStatus;

  // Denormalized, recalculated by the Trust & Safety module on review write —
  // see docs/DATABASE_SCHEMA.md.
  @Column({ name: 'avg_rating', type: 'numeric', precision: 2, scale: 1, default: 0 })
  avgRating: number;

  @Column({ name: 'review_count', type: 'int', default: 0 })
  reviewCount: number;

  @OneToMany(() => ListingPhoto, (photo) => photo.listing)
  photos: ListingPhoto[];

  @OneToMany(() => Asset, (asset) => asset.listing)
  assets: Asset[];

  isLive(): boolean {
    return this.status === ListingStatus.LIVE;
  }
}
