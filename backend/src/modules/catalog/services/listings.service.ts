import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DomainException } from '@common/errors/domain.exception';
import { ErrorCode } from '@common/errors/error-codes.enum';
import { CursorPage } from '@common/dto/cursor-pagination.dto';
import { AuditLogService } from '@common/audit/audit-log.service';
import { AuditActorType } from '@common/audit/audit-actor-type.enum';
import { DomainEvents } from '@common/events/domain-events';
import { STORAGE_PORT, StoragePort } from '@common/storage/storage.port';
import { ListingRepository } from '../repositories/listing.repository';
import { ListingPhotoRepository } from '../repositories/listing-photo.repository';
import { Listing } from '../entities/listing.entity';
import { ListingPhoto } from '../entities/listing-photo.entity';
import { ListingStatus } from '../enums/listing.enums';
import { CreateListingDto } from '../dto/create-listing.dto';
import { UpdateListingDto } from '../dto/update-listing.dto';
import { QueryListingsDto } from '../dto/query-listings.dto';
import { QuoteResult } from '../dto/quote-result.interface';
import { CategoriesService } from './categories.service';
import { ListingAttributeValidatorService } from './listing-attribute-validator.service';
import { ProviderProfileService } from '@modules/identity/services/provider-profile.service';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const LIVE_STATUSES = [ListingStatus.LIVE];
const ALL_STATUSES = Object.values(ListingStatus);
/** A listing needs at least one photo to look trustworthy enough to book, and a cap keeps the gallery/upload UI predictable. */
const MIN_LISTING_PHOTOS = 1;
const MAX_LISTING_PHOTOS = 4;
const MAX_PHOTO_SIZE_BYTES = 8 * 1024 * 1024;

@Injectable()
export class ListingsService {
  constructor(
    private readonly listingRepository: ListingRepository,
    private readonly photoRepository: ListingPhotoRepository,
    private readonly categoriesService: CategoriesService,
    private readonly attributeValidator: ListingAttributeValidatorService,
    private readonly auditLogService: AuditLogService,
    private readonly eventEmitter: EventEmitter2,
    private readonly providerProfileService: ProviderProfileService,
    @Inject(STORAGE_PORT) private readonly storage: StoragePort,
  ) {}

  /** The frontend's single source of truth for its own copy of these limits — see ListingsController's public config route. */
  getPhotoLimits(): { minPhotos: number; maxPhotos: number; maxFileSizeBytes: number } {
    return { minPhotos: MIN_LISTING_PHOTOS, maxPhotos: MAX_LISTING_PHOTOS, maxFileSizeBytes: MAX_PHOTO_SIZE_BYTES };
  }

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
      quantityAvailable: dto.quantityAvailable ?? 1,
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
   * draft/pending/paused listing uses GET /listings/:id/manage instead (see
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
    return this.withPhotoUrls(listing);
  }

  /** [Owner or admin] Every status, full resolved photo gallery — what the edit flow and the admin drawer both actually need, unlike getDetail()'s public LIVE-only projection. */
  async getDetailForManage(id: string): Promise<Listing> {
    const listing = await this.findByIdOrFail(id);
    return this.withPhotoUrls(listing);
  }

  /** [Admin] Same as getDetailForManage(), plus the Rental Partner's name and category name the admin drawer's Overview tab shows. */
  async getDetailForAdmin(id: string): Promise<Listing & { providerName: string | null; categoryName: string | null }> {
    const listing = await this.getDetailForManage(id);
    const [provider, category] = await Promise.all([
      this.providerProfileService.getById(listing.providerId).catch(() => null),
      this.categoriesService.getByIdOrFail(listing.categoryId).catch(() => null),
    ]);
    return Object.assign(listing, {
      providerName: provider?.businessName ?? null,
      categoryName: category?.name ?? null,
    });
  }

  /**
   * Resolves every photo's storageKey to a real URL, ordered so index 0 is
   * always the cover photo — same Object.assign technique
   * VerificationDocumentsService.listForProvider() uses, which keeps the
   * Listing prototype intact rather than losing it to a `{...spread}`.
   */
  private async withPhotoUrls(listing: Listing): Promise<Listing> {
    const photos = await this.photoRepository.findByListing(listing.id);
    const resolved = await Promise.all(
      photos.map(async (photo) => Object.assign(photo, { url: await this.storage.getUrl(photo.storageKey) })),
    );
    return Object.assign(listing, { photos: resolved });
  }

  /** [List rows] Only the cover (position 0) photo's URL, not the whole gallery — avoids N-photos-per-row resolution on a list page. */
  private async withCoverPhotoUrl(listing: Listing): Promise<Listing> {
    const cover = listing.photos?.[0];
    if (!cover) return Object.assign(listing, { coverPhotoUrl: null });
    const coverPhotoUrl = await this.storage.getUrl(cover.storageKey);
    return Object.assign(listing, { coverPhotoUrl, photos: undefined });
  }

  private async withCoverPhotos(page: CursorPage<Listing>): Promise<CursorPage<Listing>> {
    const data = await Promise.all(page.data.map((listing) => this.withCoverPhotoUrl(listing)));
    return { ...page, data };
  }

  async search(dto: QueryListingsDto): Promise<CursorPage<Listing>> {
    return this.withCoverPhotos(await this.listingRepository.search(dto, LIVE_STATUSES));
  }

  /** A provider's own listings, any status — GET /listings?providerId=me. */
  async searchOwn(dto: QueryListingsDto): Promise<CursorPage<Listing>> {
    return this.withCoverPhotos(await this.listingRepository.search(dto, ALL_STATUSES));
  }

  /**
   * [Admin] Every listing platform-wide, any status, no provider-ownership
   * restriction — the Listings view's search, and also what backs the
   * "pending review" filter that replaces the old standalone moderation
   * screen (same query, `status: PENDING_REVIEW`). `dto.status` narrows to
   * one status; omitted, every status is included (same as searchOwn()).
   */
  async searchForAdmin(dto: QueryListingsDto & { status?: ListingStatus }): Promise<CursorPage<Listing>> {
    const statuses = dto.status ? [dto.status] : ALL_STATUSES;
    return this.withCoverPhotos(await this.listingRepository.search(dto, statuses));
  }

  /** [Admin] Every listing awaiting moderation, across all providers — GET /admin/listings/moderation-queue. */
  async getModerationQueue(): Promise<Listing[]> {
    return this.listingRepository.findPendingReview();
  }

  async softDelete(id: string): Promise<void> {
    await this.listingRepository.softDelete(id);
  }

  /** [Admin] Pulls a LIVE listing off the marketplace without rejecting/deleting it — the provider can republish via the normal publish() flow (PAUSED → LIVE) once the issue is resolved. Unlike pause() (self-service, unaudited), this records who and why. */
  async pauseAsAdmin(id: string, adminId: string, reason?: string): Promise<Listing> {
    const listing = await this.findByIdOrFail(id);
    const before = { status: listing.status };
    listing.status = ListingStatus.PAUSED;
    const saved = await this.listingRepository.save(listing);
    await this.auditLogService.record({
      actorId: adminId,
      actorType: AuditActorType.ADMIN,
      action: 'listing.pause',
      entityType: 'Listing',
      entityId: id,
      before,
      after: { status: saved.status, reason },
    });
    return saved;
  }

  /** [Admin] Reverses pauseAsAdmin() — PAUSED back to LIVE. */
  async reinstateAsAdmin(id: string, adminId: string): Promise<Listing> {
    const listing = await this.findByIdOrFail(id);
    if (listing.status !== ListingStatus.PAUSED) {
      throw DomainException.conflict(
        ErrorCode.BOOKING_INVALID_STATE_TRANSITION,
        `Only a paused listing can be reinstated (current status: "${listing.status}").`,
      );
    }
    const before = { status: listing.status };
    listing.status = ListingStatus.LIVE;
    const saved = await this.listingRepository.save(listing);
    await this.auditLogService.record({
      actorId: adminId,
      actorType: AuditActorType.ADMIN,
      action: 'listing.reinstate',
      entityType: 'Listing',
      entityId: id,
      before,
      after: { status: saved.status },
    });
    return saved;
  }

  /** [Admin] Removes a listing (e.g. test/junk data) — soft delete, reversible via the DB's deleted_at column, never a hard delete. */
  async removeAsAdmin(id: string, adminId: string): Promise<void> {
    const listing = await this.findByIdOrFail(id);
    await this.listingRepository.softDelete(id);
    await this.auditLogService.record({
      actorId: adminId,
      actorType: AuditActorType.ADMIN,
      action: 'listing.remove',
      entityType: 'Listing',
      entityId: id,
      before: { status: listing.status, title: listing.title },
      after: { deleted: true },
    });
  }

  /** DRAFT/REJECTED/CHANGES_REQUESTED submit (or resubmit) for moderation; PAUSED reactivates directly (already approved once). */
  async publish(id: string): Promise<Listing> {
    const listing = await this.findByIdOrFail(id);
    const provider = await this.providerProfileService.getById(listing.providerId);
    this.providerProfileService.assertVerified(provider);
    const photoCount = await this.photoRepository.countByListing(id);
    if (photoCount < MIN_LISTING_PHOTOS) {
      throw DomainException.unprocessable(
        ErrorCode.LISTING_PHOTO_REQUIRED,
        'Please upload at least one image of your item before submitting your listing.',
      );
    }
    let enteringReview = false;
    if (listing.status === ListingStatus.PAUSED) {
      listing.status = ListingStatus.LIVE;
    } else if (
      listing.status === ListingStatus.DRAFT ||
      listing.status === ListingStatus.REJECTED ||
      listing.status === ListingStatus.CHANGES_REQUESTED
    ) {
      listing.status = ListingStatus.PENDING_REVIEW;
      enteringReview = true;
    } else {
      throw DomainException.conflict(
        ErrorCode.BOOKING_INVALID_STATE_TRANSITION,
        `Cannot publish a listing in "${listing.status}" status.`,
      );
    }
    const saved = await this.listingRepository.save(listing);
    if (enteringReview) {
      const providerUserId = await this.providerProfileService.getById(saved.providerId).then((p) => p.userId).catch(() => null);
      if (providerUserId) {
        this.eventEmitter.emit(DomainEvents.ListingSubmitted, {
          recipientId: providerUserId,
          listingId: saved.id,
          listingTitle: saved.title,
        });
      }
    }
    return saved;
  }

  async pause(id: string): Promise<Listing> {
    const listing = await this.findByIdOrFail(id);
    // Only a LIVE listing can be paused — without this guard, a never-
    // submitted DRAFT could be paused then reinstated by an admin straight
    // to LIVE (reinstateAsAdmin only checks "is it paused," never "was it
    // ever approved"), skipping moderation review entirely.
    if (listing.status !== ListingStatus.LIVE) {
      throw DomainException.conflict(
        ErrorCode.BOOKING_INVALID_STATE_TRANSITION,
        `Only a live listing can be paused (current status: "${listing.status}").`,
      );
    }
    listing.status = ListingStatus.PAUSED;
    return this.listingRepository.save(listing);
  }

  /** [Admin] Approves a pending_review listing — see AdminListingsController. */
  async approve(id: string, adminId: string): Promise<Listing> {
    const listing = await this.findByIdOrFail(id);
    if (listing.status !== ListingStatus.PENDING_REVIEW) {
      throw DomainException.conflict(
        ErrorCode.BOOKING_INVALID_STATE_TRANSITION,
        `Only listings pending review can be approved (current status: "${listing.status}").`,
      );
    }
    const before = { status: listing.status };
    listing.status = ListingStatus.LIVE;
    const saved = await this.listingRepository.save(listing);
    await this.auditLogService.record({
      actorId: adminId,
      actorType: AuditActorType.ADMIN,
      action: 'listing.approve',
      entityType: 'Listing',
      entityId: id,
      before,
      after: { status: saved.status },
    });
    const providerUserId = await this.providerProfileService.getById(saved.providerId).then((p) => p.userId).catch(() => null);
    if (providerUserId) {
      this.eventEmitter.emit(DomainEvents.ListingApproved, {
        recipientId: providerUserId,
        listingId: saved.id,
        listingTitle: saved.title,
      });
    }
    return saved;
  }

  async reject(id: string, adminId: string, reason: string): Promise<Listing> {
    const listing = await this.findByIdOrFail(id);
    if (listing.status !== ListingStatus.PENDING_REVIEW) {
      throw DomainException.conflict(
        ErrorCode.BOOKING_INVALID_STATE_TRANSITION,
        `Only listings pending review can be rejected (current status: "${listing.status}").`,
      );
    }
    const before = { status: listing.status };
    listing.status = ListingStatus.REJECTED;
    listing.rejectionReason = reason;
    const saved = await this.listingRepository.save(listing);
    await this.auditLogService.record({
      actorId: adminId,
      actorType: AuditActorType.ADMIN,
      action: 'listing.reject',
      entityType: 'Listing',
      entityId: id,
      before,
      after: { status: saved.status, reason },
    });
    const providerUserId = await this.providerProfileService.getById(saved.providerId).then((p) => p.userId).catch(() => null);
    if (providerUserId) {
      this.eventEmitter.emit(DomainEvents.ListingRejected, {
        recipientId: providerUserId,
        listingId: saved.id,
        listingTitle: saved.title,
        reason,
      });
    }
    return saved;
  }

  /** [Admin] The PENDING_REVIEW gate's "not quite, but fixable" outcome — distinct from flagListing() below, which never changes status. */
  async requestChanges(id: string, adminId: string, reason: string): Promise<Listing> {
    const listing = await this.findByIdOrFail(id);
    if (listing.status !== ListingStatus.PENDING_REVIEW) {
      throw DomainException.conflict(
        ErrorCode.BOOKING_INVALID_STATE_TRANSITION,
        `Only listings pending review can have changes requested (current status: "${listing.status}").`,
      );
    }
    const before = { status: listing.status };
    listing.status = ListingStatus.CHANGES_REQUESTED;
    listing.changesRequestedReason = reason;
    const saved = await this.listingRepository.save(listing);
    await this.auditLogService.record({
      actorId: adminId,
      actorType: AuditActorType.ADMIN,
      action: 'listing.request_changes',
      entityType: 'Listing',
      entityId: id,
      before,
      after: { status: saved.status, reason },
    });
    const providerUserId = await this.providerProfileService.getById(saved.providerId).then((p) => p.userId).catch(() => null);
    if (providerUserId) {
      this.eventEmitter.emit(DomainEvents.ListingChangesRequested, {
        recipientId: providerUserId,
        listingId: saved.id,
        listingTitle: saved.title,
        reason,
      });
    }
    return saved;
  }

  /** [Admin] A standalone, reason-required marker — unlike requestChanges(), this never touches `status`, so a flagged LIVE listing stays bookable while the Rental Partner is made aware and fixes it. */
  async flagListing(id: string, adminId: string, reason: string): Promise<Listing> {
    const listing = await this.findByIdOrFail(id);
    listing.flaggedAt = new Date();
    listing.flagReason = reason;
    const saved = await this.listingRepository.save(listing);
    await this.auditLogService.record({
      actorId: adminId,
      actorType: AuditActorType.ADMIN,
      action: 'listing.flag',
      entityType: 'Listing',
      entityId: id,
      before: null,
      after: { reason },
    });
    const providerUserId = await this.providerProfileService.getById(saved.providerId).then((p) => p.userId).catch(() => null);
    if (providerUserId) {
      this.eventEmitter.emit(DomainEvents.ListingFlagged, {
        recipientId: providerUserId,
        listingId: saved.id,
        listingTitle: saved.title,
        reason,
        scope: 'listing',
      });
    }
    return saved;
  }

  /** [Admin] Same marker as flagListing(), scoped to one photo. Clearing it is removePhoto() on that id — the Rental Partner's "replace it" path — not a separate unflag endpoint. */
  async flagPhoto(listingId: string, photoId: string, adminId: string, reason: string): Promise<ListingPhoto> {
    const listing = await this.findByIdOrFail(listingId);
    const photo = await this.photoRepository.findByIdOrFail(photoId, 'Photo');
    photo.flaggedAt = new Date();
    photo.flagReason = reason;
    const saved = await this.photoRepository.save(photo);
    await this.auditLogService.record({
      actorId: adminId,
      actorType: AuditActorType.ADMIN,
      action: 'listing_photo.flag',
      entityType: 'ListingPhoto',
      entityId: photoId,
      before: null,
      after: { reason },
    });
    const providerUserId = await this.providerProfileService.getById(listing.providerId).then((p) => p.userId).catch(() => null);
    if (providerUserId) {
      this.eventEmitter.emit(DomainEvents.ListingFlagged, {
        recipientId: providerUserId,
        listingId: listing.id,
        listingTitle: listing.title,
        reason,
        scope: 'image',
      });
    }
    return saved;
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
      quantityAvailable: source.quantityAvailable,
      status: ListingStatus.DRAFT,
    });
    return this.listingRepository.save(copy);
  }

  async addPhoto(listingId: string, storageKey: string): Promise<ListingPhoto> {
    const position = await this.photoRepository.countByListing(listingId);
    if (position >= MAX_LISTING_PHOTOS) {
      throw DomainException.unprocessable(
        ErrorCode.LISTING_PHOTO_LIMIT_EXCEEDED,
        `A listing can have at most ${MAX_LISTING_PHOTOS} photos.`,
      );
    }
    const photo = this.photoRepository.create({ listingId, storageKey, position });
    return this.photoRepository.save(photo);
  }

  async getPhotos(listingId: string) {
    return this.photoRepository.findByListing(listingId);
  }

  /**
   * Hard delete — a photo is a raw file reference, not an auditable business
   * record (consistent with addPhoto() having no soft-delete concept
   * either). Also the Rental Partner's "replace it" path for a flagged
   * photo: deleting it clears the flag along with the row, no separate
   * unflag endpoint needed. Re-sequences the remaining photos' `position`
   * values to stay contiguous from 0, so the cover (position 0) is never a
   * gap left by whatever was just removed.
   */
  async removePhoto(listingId: string, photoId: string): Promise<void> {
    const photo = await this.photoRepository.findByIdOrFail(photoId, 'Photo');
    if (photo.listingId !== listingId) {
      throw DomainException.notFound(ErrorCode.RESOURCE_NOT_FOUND, 'Photo not found on this listing.');
    }
    await this.storage.delete(photo.storageKey).catch(() => undefined);
    await this.photoRepository.remove(photoId);
    const remaining = await this.photoRepository.findByListing(listingId);
    await Promise.all(remaining.map((p, index) => (p.position === index ? null : this.photoRepository.save(Object.assign(p, { position: index })))));
  }

  /** Rewrites `position` to match the submitted order — dragging a photo to the front *is* making it the cover (position 0). */
  async reorderPhotos(listingId: string, orderedPhotoIds: string[]): Promise<ListingPhoto[]> {
    const existing = await this.photoRepository.findByListing(listingId);
    const existingIds = new Set(existing.map((p) => p.id));
    const submittedIds = new Set(orderedPhotoIds);
    const matches = existingIds.size === submittedIds.size && [...existingIds].every((id) => submittedIds.has(id));
    if (!matches) {
      throw DomainException.unprocessable(
        ErrorCode.VALIDATION_FAILED,
        'The submitted photo order must include exactly this listing\'s existing photos, no more and no fewer.',
      );
    }
    const byId = new Map(existing.map((p) => [p.id, p]));
    return Promise.all(orderedPhotoIds.map((id, index) => this.photoRepository.save(Object.assign(byId.get(id)!, { position: index }))));
  }

  /**
   * Single source of truth for the rental price breakdown — replaces the
   * duplicated formula previously living in both listing.html and
   * checkout.html on the frontend. `nights` = calendar nights between pickup
   * and return (checkout − checkin), minimum 1; this is the one place that
   * convention is decided, rather than each caller assuming its own.
   */
  computeQuote(
    listing: Listing,
    from: Date,
    to: Date,
    commissionRateBps: number,
    quantity = 1,
  ): QuoteResult {
    if (to.getTime() <= from.getTime()) {
      throw DomainException.unprocessable(
        ErrorCode.BOOKING_DATE_RANGE_INVALID,
        'The return date must be after the pickup date.',
      );
    }
    const nights = Math.max(1, Math.ceil((to.getTime() - from.getTime()) / MS_PER_DAY));
    const rentalFeeMinor = listing.priceMinor * nights * quantity;
    const serviceFeeMinor = Math.round((rentalFeeMinor * commissionRateBps) / 10000);
    const depositMinor = (listing.depositMinor ?? 0) * quantity;
    return {
      currency: 'NGN',
      nights,
      quantity,
      priceMinor: listing.priceMinor,
      rentalFeeMinor,
      serviceFeeMinor,
      depositMinor,
      totalMinor: rentalFeeMinor + serviceFeeMinor + depositMinor,
    };
  }

  async getQuote(listingId: string, from: Date, to: Date, quantity = 1): Promise<QuoteResult> {
    const listing = await this.findByIdOrFail(listingId);
    const category = await this.categoriesService.getByIdOrFail(listing.categoryId);
    return this.computeQuote(listing, from, to, category.commissionRateBps, quantity);
  }

  /** [Admin] Overview's price-distribution histogram. */
  async getPriceDistribution(): Promise<{ bucket: string; count: number }[]> {
    return this.listingRepository.getPriceDistribution();
  }

  /** [Trust] Recomputes the denormalized avgRating/reviewCount from a fresh aggregate over Review rows — never written directly by review submission itself. */
  async recomputeRatingAggregate(
    listingId: string,
    avgRating: number,
    reviewCount: number,
  ): Promise<Listing> {
    const listing = await this.findByIdOrFail(listingId);
    listing.avgRating = avgRating;
    listing.reviewCount = reviewCount;
    return this.listingRepository.save(listing);
  }
}
