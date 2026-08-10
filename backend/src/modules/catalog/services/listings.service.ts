import { Injectable } from '@nestjs/common';
import { DomainException } from '@common/errors/domain.exception';
import { ErrorCode } from '@common/errors/error-codes.enum';
import { CursorPage } from '@common/dto/cursor-pagination.dto';
import { ListingRepository } from '../repositories/listing.repository';
import { ListingPhotoRepository } from '../repositories/listing-photo.repository';
import { Listing } from '../entities/listing.entity';
import { ListingStatus } from '../enums/listing.enums';
import { CreateListingDto } from '../dto/create-listing.dto';
import { UpdateListingDto } from '../dto/update-listing.dto';
import { QueryListingsDto } from '../dto/query-listings.dto';
import { QuoteResult } from '../dto/quote-result.interface';
import { CategoriesService } from './categories.service';
import { ListingAttributeValidatorService } from './listing-attribute-validator.service';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const LIVE_STATUSES = [ListingStatus.LIVE];
const ALL_STATUSES = Object.values(ListingStatus);

@Injectable()
export class ListingsService {
  constructor(
    private readonly listingRepository: ListingRepository,
    private readonly photoRepository: ListingPhotoRepository,
    private readonly categoriesService: CategoriesService,
    private readonly attributeValidator: ListingAttributeValidatorService,
  ) {}

  async create(providerId: string, dto: CreateListingDto): Promise<Listing> {
    const category = await this.categoriesService.getByIdOrFail(dto.categoryId);
    this.categoriesService.assertActive(category);
    this.attributeValidator.validate(category, dto.attributes ?? {});

    const listing = this.listingRepository.create({
      providerId,
      categoryId: dto.categoryId,
      title: dto.title,
      description: dto.description,
      attributes: dto.attributes ?? {},
      priceMinor: dto.priceMinor,
      priceUnit: dto.priceUnit,
      depositMinor: dto.depositMinor ?? null,
      lat: dto.lat ?? null,
      lng: dto.lng ?? null,
      locationText: dto.locationText,
      condition: dto.condition,
      minDuration: dto.minDuration ?? 1,
      maxDuration: dto.maxDuration ?? null,
      cancellationPolicy: dto.cancellationPolicy,
      bookingMode: dto.bookingMode,
      status: ListingStatus.DRAFT,
    });
    return this.listingRepository.save(listing);
  }

  /** Ownership is enforced by IsListingOwnerPolicy at the controller — this method trusts its caller. */
  async update(id: string, dto: UpdateListingDto): Promise<Listing> {
    const listing = await this.listingRepository.findByIdOrFail(id, 'Listing');

    if (dto.categoryId && dto.categoryId !== listing.categoryId) {
      const category = await this.categoriesService.getByIdOrFail(dto.categoryId);
      this.categoriesService.assertActive(category);
    }
    if (dto.attributes) {
      const category = await this.categoriesService.getByIdOrFail(
        dto.categoryId ?? listing.categoryId,
      );
      this.attributeValidator.validate(category, dto.attributes);
    }

    Object.assign(listing, dto);
    return this.listingRepository.save(listing);
  }

  async findByIdOrFail(id: string): Promise<Listing> {
    return this.listingRepository.findByIdOrFail(id, 'Listing');
  }

  /**
   * GET /listings/:id — public and LIVE-only. A provider viewing their own
   * draft/pending/paused listing uses GET /listings/mine instead (see
   * ListingsController for why this endpoint can't offer an owner exception).
   */
  async getDetail(id: string): Promise<Listing> {
    const listing = await this.findByIdOrFail(id);
    if (listing.status !== ListingStatus.LIVE) {
      throw DomainException.notFound(
        ErrorCode.LISTING_NOT_LIVE,
        'This listing is not currently available.',
      );
    }
    return listing;
  }

  async search(dto: QueryListingsDto): Promise<CursorPage<Listing>> {
    return this.listingRepository.search(dto, LIVE_STATUSES);
  }

  /** A provider's own listings, any status — GET /listings?providerId=me. */
  async searchOwn(dto: QueryListingsDto): Promise<CursorPage<Listing>> {
    return this.listingRepository.search(dto, ALL_STATUSES);
  }

  async softDelete(id: string): Promise<void> {
    await this.listingRepository.softDelete(id);
  }

  /** DRAFT/REJECTED submit for moderation; PAUSED reactivates directly (already approved once). */
  async publish(id: string): Promise<Listing> {
    const listing = await this.findByIdOrFail(id);
    if (listing.status === ListingStatus.PAUSED) {
      listing.status = ListingStatus.LIVE;
    } else if (
      listing.status === ListingStatus.DRAFT ||
      listing.status === ListingStatus.REJECTED
    ) {
      listing.status = ListingStatus.PENDING_REVIEW;
    } else {
      throw DomainException.conflict(
        ErrorCode.BOOKING_INVALID_STATE_TRANSITION,
        `Cannot publish a listing in "${listing.status}" status.`,
      );
    }
    return this.listingRepository.save(listing);
  }

  async pause(id: string): Promise<Listing> {
    const listing = await this.findByIdOrFail(id);
    listing.status = ListingStatus.PAUSED;
    return this.listingRepository.save(listing);
  }

  /**
   * [Admin] Approves a pending_review listing. Lives here rather than in a
   * dedicated Admin module (not built this phase) so the moderation flow is
   * actually testable end-to-end; the endpoint is @Roles(ADMIN)-gated in
   * ListingsController and can move into AdminModule later without this
   * logic changing.
   */
  async approve(id: string): Promise<Listing> {
    const listing = await this.findByIdOrFail(id);
    if (listing.status !== ListingStatus.PENDING_REVIEW) {
      throw DomainException.conflict(
        ErrorCode.BOOKING_INVALID_STATE_TRANSITION,
        `Only listings pending review can be approved (current status: "${listing.status}").`,
      );
    }
    listing.status = ListingStatus.LIVE;
    return this.listingRepository.save(listing);
  }

  async reject(id: string): Promise<Listing> {
    const listing = await this.findByIdOrFail(id);
    listing.status = ListingStatus.REJECTED;
    return this.listingRepository.save(listing);
  }

  async duplicate(id: string): Promise<Listing> {
    const source = await this.findByIdOrFail(id);
    const copy = this.listingRepository.create({
      providerId: source.providerId,
      categoryId: source.categoryId,
      title: `${source.title} (copy)`,
      description: source.description,
      attributes: source.attributes,
      priceMinor: source.priceMinor,
      priceUnit: source.priceUnit,
      depositMinor: source.depositMinor,
      lat: source.lat,
      lng: source.lng,
      locationText: source.locationText,
      condition: source.condition,
      minDuration: source.minDuration,
      maxDuration: source.maxDuration,
      cancellationPolicy: source.cancellationPolicy,
      bookingMode: source.bookingMode,
      status: ListingStatus.DRAFT,
    });
    return this.listingRepository.save(copy);
  }

  async addPhoto(listingId: string, storageKey: string): Promise<void> {
    const position = await this.photoRepository.countByListing(listingId);
    const photo = this.photoRepository.create({ listingId, storageKey, position });
    await this.photoRepository.save(photo);
  }

  async getPhotos(listingId: string) {
    return this.photoRepository.findByListing(listingId);
  }

  /**
   * Single source of truth for the rental price breakdown — replaces the
   * duplicated formula previously living in both listing.html and
   * checkout.html on the frontend. `nights` = calendar nights between pickup
   * and return (checkout − checkin), minimum 1; this is the one place that
   * convention is decided, rather than each caller assuming its own.
   */
  computeQuote(listing: Listing, from: Date, to: Date, commissionRateBps: number): QuoteResult {
    if (to.getTime() <= from.getTime()) {
      throw DomainException.unprocessable(
        ErrorCode.BOOKING_DATE_RANGE_INVALID,
        'The return date must be after the pickup date.',
      );
    }
    const nights = Math.max(1, Math.ceil((to.getTime() - from.getTime()) / MS_PER_DAY));
    const rentalFeeMinor = listing.priceMinor * nights;
    const serviceFeeMinor = Math.round((rentalFeeMinor * commissionRateBps) / 10000);
    const depositMinor = listing.depositMinor ?? 0;
    return {
      currency: 'NGN',
      nights,
      priceMinor: listing.priceMinor,
      rentalFeeMinor,
      serviceFeeMinor,
      depositMinor,
      totalMinor: rentalFeeMinor + serviceFeeMinor + depositMinor,
    };
  }

  async getQuote(listingId: string, from: Date, to: Date): Promise<QuoteResult> {
    const listing = await this.findByIdOrFail(listingId);
    const category = await this.categoriesService.getByIdOrFail(listing.categoryId);
    return this.computeQuote(listing, from, to, category.commissionRateBps);
  }
}
