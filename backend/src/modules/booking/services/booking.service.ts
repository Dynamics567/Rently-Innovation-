import { Inject, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { DomainException } from '@common/errors/domain.exception';
import { ErrorCode } from '@common/errors/error-codes.enum';
import { CursorPage } from '@common/dto/cursor-pagination.dto';
import { toTstzRangeLiteral } from '@common/utils/tstzrange.util';
import { ListingsService } from '@modules/catalog/services/listings.service';
import { AvailabilityService } from '@modules/catalog/services/availability.service';
import { AssetsService } from '@modules/catalog/services/assets.service';
import { ListingStatus, BookingMode } from '@modules/catalog/enums/listing.enums';
import { Booking } from '../entities/booking.entity';
import { BookingStatusHistory } from '../entities/booking-status-history.entity';
import { BookingExtensionRequest } from '../entities/booking-extension-request.entity';
import { BookingRepository } from '../repositories/booking.repository';
import { BookingStatusHistoryRepository } from '../repositories/booking-status-history.repository';
import { BookingExtensionRequestRepository } from '../repositories/booking-extension-request.repository';
import { BOOKING_STAGE_ORDER, BookingStage, BookingStatus } from '../enums/booking.enums';
import { ExtensionRequestStatus } from '../enums/extension-request-status.enum';
import { CreateBookingDto } from '../dto/create-booking.dto';
import { QueryBookingsDto } from '../dto/query-bookings.dto';
import { PAYMENT_PORT, PaymentPort } from './payment.port';
import { computeCancellationRefund, CancellationRefund } from './cancellation-refund.util';

interface StageStep {
  stage: BookingStage;
  status: BookingStatus;
}

@Injectable()
export class BookingService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly bookingRepository: BookingRepository,
    private readonly historyRepository: BookingStatusHistoryRepository,
    private readonly extensionRequestRepository: BookingExtensionRequestRepository,
    private readonly listingsService: ListingsService,
    private readonly availabilityService: AvailabilityService,
    private readonly assetsService: AssetsService,
    @Inject(PAYMENT_PORT) private readonly paymentPort: PaymentPort,
  ) {}

  async findByIdOrFail(id: string): Promise<Booking> {
    return this.bookingRepository.findByIdOrFail(id, 'Booking');
  }

  async getHistory(bookingId: string): Promise<BookingStatusHistory[]> {
    return this.historyRepository.findByBooking(bookingId);
  }

  async searchAsRenter(renterId: string, query: QueryBookingsDto): Promise<CursorPage<Booking>> {
    return this.bookingRepository.search({
      role: 'renter',
      renterId,
      status: query.status,
      cursor: query.cursor,
      limit: query.limit,
    });
  }

  /** `listingIds` resolved by the caller (BookingsController) via ListingsService — Booking never queries Catalog's tables directly. */
  async searchAsProvider(
    listingIds: string[],
    query: QueryBookingsDto,
  ): Promise<CursorPage<Booking>> {
    return this.bookingRepository.search({
      role: 'provider',
      listingIds,
      status: query.status,
      cursor: query.cursor,
      limit: query.limit,
    });
  }

  /**
   * The central transactional action of the whole app. In one DB
   * transaction: fetch + validate the listing, compute the fee snapshot,
   * insert the booking row (the `no_overlapping_bookings` EXCLUDE
   * constraint is the actual availability guarantee — see
   * AllExceptionsFilter for how a race lands as 409
   * BOOKING_DATES_UNAVAILABLE), then brand it straight through to
   * `reserved` for instant-book listings (payment captured immediately) or
   * leave it at `requested` for request-to-book (captured only on
   * provider approval).
   */
  async create(renterId: string, dto: CreateBookingDto, idempotencyKey?: string): Promise<Booking> {
    if (idempotencyKey) {
      const existing = await this.bookingRepository.findByIdempotencyKey(idempotencyKey);
      if (existing) {
        return existing;
      }
    }

    const listing = await this.listingsService.findByIdOrFail(dto.listingId);
    if (listing.status !== ListingStatus.LIVE) {
      throw DomainException.conflict(
        ErrorCode.LISTING_NOT_LIVE,
        'This listing is not currently bookable.',
      );
    }

    const from = new Date(dto.from);
    const to = new Date(dto.to);

    // Two application-level guards layered on top of the DB-level
    // no_overlapping_bookings EXCLUDE constraint, which remains the only
    // true race-proof guarantee (neither of these is aware of it). A
    // provider's manual block or an unmet turnaround buffer are both lower-
    // stakes races than two renters fighting for the same instant — worst
    // case here is a booking the provider then has to decline, not a true
    // double-booking — so a check-then-write is an accepted, proportionate
    // gap rather than something that needs its own exclusion constraint.
    const blocked = await this.availabilityService.isBlocked(dto.listingId, from, to);
    if (blocked) {
      throw DomainException.conflict(
        ErrorCode.BOOKING_DATES_UNAVAILABLE,
        'These dates fall within a period the provider has blocked.',
      );
    }
    // A listing with active Asset rows has more than one physical unit —
    // pick the first one free for this window instead of a single
    // listing-wide buffer check. A listing with zero Asset rows (the vast
    // majority) falls through to the original single-unit check unchanged.
    const activeAssets = await this.assetsService.getActiveForListing(dto.listingId);
    let assetId: string | null = null;
    if (activeAssets.length > 0) {
      for (const asset of activeAssets) {
        const conflict = await this.bookingRepository.hasOverlapForAssetWithBuffer(
          asset.id,
          from,
          to,
          listing.turnaroundBufferMinutes,
        );
        if (!conflict) {
          assetId = asset.id;
          break;
        }
      }
      if (!assetId) {
        throw DomainException.conflict(
          ErrorCode.BOOKING_DATES_UNAVAILABLE,
          'Every unit of this listing is already booked for these dates.',
        );
      }
    } else {
      const bufferConflict = await this.bookingRepository.hasOverlapWithBuffer(
        dto.listingId,
        from,
        to,
        listing.turnaroundBufferMinutes,
      );
      if (bufferConflict) {
        throw DomainException.conflict(
          ErrorCode.BOOKING_DATES_UNAVAILABLE,
          `This provider needs ${listing.turnaroundBufferMinutes} minutes between rentals — these dates are too close to another booking.`,
        );
      }
    }

    const quote = await this.listingsService.getQuote(dto.listingId, from, to);

    return this.dataSource.transaction(async (manager) => {
      const booking = manager.getRepository(Booking).create({
        listingId: dto.listingId,
        assetId,
        renterId,
        during: toTstzRangeLiteral(from, to),
        startsAt: from,
        endsAt: to,
        status: BookingStatus.PENDING,
        stage: BookingStage.REQUESTED,
        bookingMode: listing.bookingMode,
        rentalFeeMinor: quote.rentalFeeMinor,
        serviceFeeMinor: quote.serviceFeeMinor,
        depositMinor: quote.depositMinor,
        totalMinor: quote.totalMinor,
        cancellationPolicy: listing.cancellationPolicy,
        idempotencyKey: idempotencyKey ?? null,
      });
      const saved = await manager.getRepository(Booking).save(booking);
      await this.recordTransition(
        manager,
        saved,
        null,
        null,
        BookingStatus.PENDING,
        BookingStage.REQUESTED,
        renterId,
      );

      if (listing.bookingMode === BookingMode.INSTANT) {
        // Instant-book: approval, payment, and reservation happen together —
        // recorded as three real transitions (each gets its own audit row)
        // rather than skipped, so the timeline is complete even though they
        // occur at the same moment.
        const accepted = await this.runSteps(
          manager,
          saved,
          [{ stage: BookingStage.ACCEPTED, status: BookingStatus.PENDING }],
          renterId,
          'Instant Book',
        );
        const charge = await this.paymentPort.charge({
          bookingId: saved.id,
          amountMinor: quote.totalMinor,
        });
        accepted.paymentReference = charge.providerReference;
        const paid = await this.runSteps(
          manager,
          accepted,
          [{ stage: BookingStage.PAYMENT, status: BookingStatus.PENDING }],
          renterId,
          'Instant Book',
        );
        return this.runSteps(
          manager,
          paid,
          [{ stage: BookingStage.RESERVED, status: BookingStatus.CONFIRMED }],
          renterId,
          'Instant Book',
        );
      }

      return saved;
    });
  }

  /** [Provider] Request-to-Book only — captures payment on approval, never before. */
  async approve(bookingId: string, actingUserId: string): Promise<Booking> {
    const booking = await this.findByIdOrFail(bookingId);
    if (booking.bookingMode !== BookingMode.REQUEST || booking.status !== BookingStatus.PENDING) {
      throw DomainException.conflict(
        ErrorCode.BOOKING_NOT_APPROVABLE,
        'Only pending request-to-book bookings can be approved.',
      );
    }

    return this.dataSource.transaction(async (manager) => {
      const charge = await this.paymentPort.charge({
        bookingId: booking.id,
        amountMinor: booking.totalMinor,
      });
      booking.paymentReference = charge.providerReference;
      const withAccepted = await this.runSteps(
        manager,
        booking,
        [{ stage: BookingStage.ACCEPTED, status: BookingStatus.PENDING }],
        actingUserId,
      );
      const withPayment = await this.runSteps(
        manager,
        withAccepted,
        [{ stage: BookingStage.PAYMENT, status: BookingStatus.PENDING }],
        actingUserId,
      );
      return this.runSteps(
        manager,
        withPayment,
        [{ stage: BookingStage.RESERVED, status: BookingStatus.CONFIRMED }],
        actingUserId,
      );
    });
  }

  async decline(bookingId: string, actingUserId: string, reason?: string): Promise<Booking> {
    const booking = await this.findByIdOrFail(bookingId);
    if (booking.status !== BookingStatus.PENDING) {
      throw DomainException.conflict(
        ErrorCode.BOOKING_NOT_APPROVABLE,
        'Only a pending booking can be declined.',
      );
    }
    return this.dataSource.transaction((manager) =>
      this.setStatusOnly(manager, booking, BookingStatus.DECLINED, actingUserId, reason),
    );
  }

  /**
   * Refunds according to the booking's snapshotted cancellation policy
   * (flexible/moderate/strict, proration by time-before-pickup — see
   * cancellation-refund.util.ts) rather than always refunding in full. Not
   * allowed once the item has left the provider's hands — that goes through
   * the normal return workflow instead.
   */
  async cancel(bookingId: string, actingUserId: string, reason?: string): Promise<Booking> {
    const booking = await this.findByIdOrFail(bookingId);
    if (!booking.isBeforePickup() || booking.status === BookingStatus.CANCELLED) {
      throw DomainException.conflict(
        ErrorCode.BOOKING_INVALID_STATE_TRANSITION,
        'This booking can no longer be cancelled — it has already been picked up or is already closed.',
      );
    }

    return this.dataSource.transaction(async (manager) => {
      let refundNote = reason;
      if (booking.status === BookingStatus.CONFIRMED) {
        const refund = computeCancellationRefund(
          booking.cancellationPolicy,
          booking.startsAt,
          new Date(),
          booking.totalMinor,
          booking.depositMinor,
        );
        await this.paymentPort.refund({
          bookingId: booking.id,
          amountMinor: refund.refundMinor,
          reason,
        });
        const pctLabel = Math.round(refund.refundPct * 100);
        refundNote = [reason, `Refunded ${pctLabel}% per ${booking.cancellationPolicy} policy.`]
          .filter(Boolean)
          .join(' — ');
      }
      return this.setStatusOnly(manager, booking, BookingStatus.CANCELLED, actingUserId, refundNote);
    });
  }

  /** Pure read — lets the frontend show "you'll get back ₦X" before the renter confirms cancellation. */
  async previewCancellationRefund(bookingId: string): Promise<CancellationRefund> {
    const booking = await this.findByIdOrFail(bookingId);
    if (booking.status !== BookingStatus.CONFIRMED) {
      // Nothing has been charged yet (still pending) or there's nothing left to refund (already closed) — full or zero refund is unambiguous, no proration math needed.
      const isPending = booking.status === BookingStatus.PENDING;
      return {
        refundMinor: isPending ? booking.totalMinor : 0,
        refundPct: isPending ? 1 : 0,
        penaltyMinor: isPending ? 0 : booking.totalMinor,
      };
    }
    return computeCancellationRefund(
      booking.cancellationPolicy,
      booking.startsAt,
      new Date(),
      booking.totalMinor,
      booking.depositMinor,
    );
  }

  /** [Provider] One handover action covers ready → pickedup → active, since the frontend has no separate "mark ready" step. */
  async confirmHandover(bookingId: string, actingUserId: string): Promise<Booking> {
    const booking = await this.assertStage(bookingId, [BookingStage.RESERVED, BookingStage.READY]);
    return this.dataSource.transaction((manager) =>
      this.runSteps(
        manager,
        booking,
        [
          { stage: BookingStage.READY, status: BookingStatus.CONFIRMED },
          { stage: BookingStage.PICKEDUP, status: BookingStatus.CONFIRMED },
          { stage: BookingStage.ACTIVE, status: BookingStatus.CONFIRMED },
        ],
        actingUserId,
      ),
    );
  }

  async scheduleReturn(bookingId: string, actingUserId: string): Promise<Booking> {
    const booking = await this.assertStage(bookingId, [BookingStage.ACTIVE]);
    return this.dataSource.transaction((manager) =>
      this.runSteps(
        manager,
        booking,
        [{ stage: BookingStage.RETURNSCHED, status: BookingStatus.CONFIRMED }],
        actingUserId,
      ),
    );
  }

  async confirmReturn(bookingId: string, actingUserId: string): Promise<Booking> {
    const booking = await this.assertStage(bookingId, [
      BookingStage.RETURNSCHED,
      BookingStage.ACTIVE,
    ]);
    return this.dataSource.transaction((manager) =>
      this.runSteps(
        manager,
        booking,
        [{ stage: BookingStage.RETURNED, status: BookingStatus.CONFIRMED }],
        actingUserId,
      ),
    );
  }

  /**
   * Inspection + deposit release + completion, as one action — Phase 1 has
   * no separate "hold pending inspection review" step (no damage-dispute
   * flow yet; see the Phase 1 plan's roadmap for Trust & Safety).
   */
  async releaseDeposit(bookingId: string, actingUserId: string): Promise<Booking> {
    const booking = await this.assertStage(bookingId, [BookingStage.RETURNED]);
    return this.dataSource.transaction(async (manager) => {
      if (booking.depositMinor > 0) {
        await this.paymentPort.release({
          bookingId: booking.id,
          amountMinor: booking.depositMinor,
        });
      }
      const inspected = await this.runSteps(
        manager,
        booking,
        [{ stage: BookingStage.INSPECTED, status: BookingStatus.CONFIRMED }],
        actingUserId,
      );
      const released = await this.runSteps(
        manager,
        inspected,
        [{ stage: BookingStage.DEPOSITRELEASED, status: BookingStatus.CONFIRMED }],
        actingUserId,
      );
      return this.runSteps(
        manager,
        released,
        [{ stage: BookingStage.COMPLETED, status: BookingStatus.COMPLETED }],
        actingUserId,
      );
    });
  }

  /**
   * [Renter] Ask to push a rental's end date out while it's ACTIVE — does
   * not touch the main pickup→return progression at all, it's a parallel
   * request that either gets approved (mutating the booking's endsAt in
   * place) or declined/cancelled with no effect on the booking itself.
   * Deposit is not re-quoted — an extension only adds rental+service fee
   * for the extra time, a deliberate simplicity call.
   */
  async requestExtension(
    bookingId: string,
    renterId: string,
    newEndsAt: Date,
  ): Promise<BookingExtensionRequest> {
    const booking = await this.assertStage(bookingId, [BookingStage.ACTIVE]);
    if (booking.renterId !== renterId) {
      throw DomainException.forbidden(ErrorCode.FORBIDDEN, 'Only the renter can request an extension.');
    }
    if (newEndsAt.getTime() <= booking.endsAt.getTime()) {
      throw DomainException.unprocessable(
        ErrorCode.BOOKING_DATE_RANGE_INVALID,
        'The new end date must be after the current end date.',
      );
    }

    const listing = await this.listingsService.findByIdOrFail(booking.listingId);
    await this.assertExtensionWindowAvailable(booking, listing.turnaroundBufferMinutes, newEndsAt);

    const quote = await this.listingsService.getQuote(booking.listingId, booking.endsAt, newEndsAt);

    const request = this.extensionRequestRepository.create({
      bookingId: booking.id,
      requestedBy: renterId,
      currentEndsAt: booking.endsAt,
      requestedEndsAt: newEndsAt,
      status: ExtensionRequestStatus.PENDING,
      additionalRentalFeeMinor: quote.rentalFeeMinor,
      additionalServiceFeeMinor: quote.serviceFeeMinor,
    });
    return this.extensionRequestRepository.save(request);
  }

  /** [Provider] Charges the additional fee, then extends the booking's endsAt/during in place. */
  async approveExtension(extensionRequestId: string, providerUserId: string): Promise<Booking> {
    const request = await this.findExtensionRequestOrFail(extensionRequestId);
    if (request.status !== ExtensionRequestStatus.PENDING) {
      throw DomainException.conflict(
        ErrorCode.EXTENSION_REQUEST_INVALID_STATE,
        'Only a pending extension request can be approved.',
      );
    }
    const booking = await this.findByIdOrFail(request.bookingId);
    const listing = await this.listingsService.findByIdOrFail(booking.listingId);
    // Re-check availability — time has passed since the request was made.
    await this.assertExtensionWindowAvailable(
      booking,
      listing.turnaroundBufferMinutes,
      request.requestedEndsAt,
    );

    const additionalMinor = (request.additionalRentalFeeMinor ?? 0) + (request.additionalServiceFeeMinor ?? 0);
    const charge = await this.paymentPort.charge({ bookingId: booking.id, amountMinor: additionalMinor });

    return this.dataSource.transaction(async (manager) => {
      booking.endsAt = request.requestedEndsAt;
      booking.during = toTstzRangeLiteral(booking.startsAt, request.requestedEndsAt);
      booking.rentalFeeMinor += request.additionalRentalFeeMinor ?? 0;
      booking.serviceFeeMinor += request.additionalServiceFeeMinor ?? 0;
      booking.totalMinor += additionalMinor;
      booking.paymentReference = charge.providerReference;
      const saved = await manager.getRepository(Booking).save(booking);
      // Recorded as a same-stage transition purely for the audit trail — the
      // booking doesn't move stages, but the timeline should show this happened.
      await this.recordTransition(
        manager,
        saved,
        saved.status,
        BookingStage.ACTIVE,
        saved.status,
        BookingStage.ACTIVE,
        providerUserId,
        `Extended to ${request.requestedEndsAt.toISOString()}`,
      );

      request.status = ExtensionRequestStatus.APPROVED;
      request.decidedBy = providerUserId;
      request.decidedAt = new Date();
      await manager.getRepository(BookingExtensionRequest).save(request);

      return saved;
    });
  }

  async declineExtension(
    extensionRequestId: string,
    providerUserId: string,
    reason?: string,
  ): Promise<BookingExtensionRequest> {
    const request = await this.findExtensionRequestOrFail(extensionRequestId);
    if (request.status !== ExtensionRequestStatus.PENDING) {
      throw DomainException.conflict(
        ErrorCode.EXTENSION_REQUEST_INVALID_STATE,
        'Only a pending extension request can be declined.',
      );
    }
    request.status = ExtensionRequestStatus.DECLINED;
    request.decidedBy = providerUserId;
    request.decidedAt = new Date();
    request.declineReason = reason ?? null;
    return this.extensionRequestRepository.save(request);
  }

  async cancelExtensionRequest(extensionRequestId: string, renterId: string): Promise<BookingExtensionRequest> {
    const request = await this.findExtensionRequestOrFail(extensionRequestId);
    if (request.status !== ExtensionRequestStatus.PENDING) {
      throw DomainException.conflict(
        ErrorCode.EXTENSION_REQUEST_INVALID_STATE,
        'Only a pending extension request can be cancelled.',
      );
    }
    if (request.requestedBy !== renterId) {
      throw DomainException.forbidden(ErrorCode.FORBIDDEN, "You can't cancel someone else's request.");
    }
    request.status = ExtensionRequestStatus.CANCELLED;
    return this.extensionRequestRepository.save(request);
  }

  async listExtensionRequestsForBooking(bookingId: string): Promise<BookingExtensionRequest[]> {
    return this.extensionRequestRepository.findByBooking(bookingId);
  }

  async findExtensionRequestOrFail(id: string): Promise<BookingExtensionRequest> {
    return this.extensionRequestRepository.findByIdOrFail(id, 'Extension request');
  }

  private async assertExtensionWindowAvailable(
    booking: Booking,
    bufferMinutes: number,
    newEndsAt: Date,
  ): Promise<void> {
    const blocked = await this.availabilityService.isBlocked(booking.listingId, booking.endsAt, newEndsAt);
    if (blocked) {
      throw DomainException.conflict(
        ErrorCode.BOOKING_DATES_UNAVAILABLE,
        'The provider has blocked part of the time you asked to extend into.',
      );
    }
    // If this booking is against a specific asset (multi-unit listing), the
    // extension only needs to avoid conflicting with THAT asset's other
    // bookings — a different unit being busy is irrelevant here.
    const conflict = booking.assetId
      ? await this.bookingRepository.hasOverlapForAssetWithBuffer(
          booking.assetId,
          booking.endsAt,
          newEndsAt,
          bufferMinutes,
          booking.id,
        )
      : await this.bookingRepository.hasOverlapWithBuffer(
          booking.listingId,
          booking.endsAt,
          newEndsAt,
          bufferMinutes,
          booking.id,
        );
    if (conflict) {
      throw DomainException.conflict(
        ErrorCode.BOOKING_DATES_UNAVAILABLE,
        'Another booking is too close to the time you asked to extend into.',
      );
    }
  }

  private async assertStage(bookingId: string, allowed: BookingStage[]): Promise<Booking> {
    const booking = await this.findByIdOrFail(bookingId);
    if (!allowed.includes(booking.stage)) {
      throw DomainException.conflict(
        ErrorCode.BOOKING_INVALID_STATE_TRANSITION,
        `This action isn't valid from stage "${booking.stage}".`,
      );
    }
    return booking;
  }

  private async setStatusOnly(
    manager: EntityManager,
    booking: Booking,
    status: BookingStatus,
    changedBy: string,
    reason?: string,
  ): Promise<Booking> {
    const fromStatus = booking.status;
    booking.status = status;
    const saved = await manager.getRepository(Booking).save(booking);
    await this.recordTransition(
      manager,
      saved,
      fromStatus,
      booking.stage,
      status,
      booking.stage,
      changedBy,
      reason,
    );
    return saved;
  }

  /** Applies each stage step in order within the given transaction, writing one history row per step. */
  private async runSteps(
    manager: EntityManager,
    booking: Booking,
    steps: StageStep[],
    changedBy: string,
    reason?: string,
  ): Promise<Booking> {
    let current = booking;
    for (const step of steps) {
      const fromStage = current.stage;
      const fromStatus = current.status;
      current.stage = step.stage;
      current.status = step.status;
      current = await manager.getRepository(Booking).save(current);
      await this.recordTransition(
        manager,
        current,
        fromStatus,
        fromStage,
        step.status,
        step.stage,
        changedBy,
        reason,
      );
    }
    return current;
  }

  private async recordTransition(
    manager: EntityManager,
    booking: Booking,
    fromStatus: BookingStatus | null,
    fromStage: BookingStage | null,
    toStatus: BookingStatus,
    toStage: BookingStage,
    changedBy: string | null,
    reason?: string,
  ): Promise<void> {
    const history = manager.getRepository(BookingStatusHistory).create({
      bookingId: booking.id,
      fromStatus,
      toStatus,
      fromStage,
      toStage,
      changedBy: changedBy ?? null,
      reason: reason ?? null,
    });
    await manager.getRepository(BookingStatusHistory).save(history);
  }

  /** Exposed for tests / future validation — confirms `toStage` is reachable from `fromStage` in the canonical order. */
  isForwardTransition(fromStage: BookingStage, toStage: BookingStage): boolean {
    return BOOKING_STAGE_ORDER.indexOf(toStage) > BOOKING_STAGE_ORDER.indexOf(fromStage);
  }
}
