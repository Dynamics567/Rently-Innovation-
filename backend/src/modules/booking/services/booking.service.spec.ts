import { BookingService } from './booking.service';
import { BookingRepository } from '../repositories/booking.repository';
import { BookingStatusHistoryRepository } from '../repositories/booking-status-history.repository';
import { Booking } from '../entities/booking.entity';
import { BookingStatusHistory } from '../entities/booking-status-history.entity';
import { BookingStage, BookingStatus } from '../enums/booking.enums';
import { ListingsService } from '@modules/catalog/services/listings.service';
import { BookingMode, CancellationPolicy, ListingStatus, PriceUnit } from '@modules/catalog/enums/listing.enums';
import { PaymentPort } from './payment.port';

/**
 * Unit-level, same shape as auth.service.spec.ts: every collaborator
 * (repositories, DataSource, PaymentPort, cross-module ListingsService) is a
 * hand-rolled mock. The DataSource mock just invokes the transaction
 * callback synchronously against a fake EntityManager whose
 * `getRepository()` returns save-through fakes — enough to exercise
 * BookingService's actual decisions (branching, stage sequencing, rejected
 * transitions) without a real database.
 */
describe('BookingService', () => {
  let service: BookingService;
  let bookingRepository: Record<'findByIdOrFail' | 'findByIdempotencyKey' | 'search', jest.Mock>;
  let historyRepository: Record<'findByBooking', jest.Mock>;
  let listingsService: Record<'findByIdOrFail' | 'getQuote', jest.Mock>;
  let paymentPort: Record<'charge' | 'refund' | 'release', jest.Mock>;
  let dataSource: { transaction: jest.Mock };

  const liveListing = {
    id: 'listing-1',
    status: ListingStatus.LIVE,
    bookingMode: BookingMode.REQUEST,
    cancellationPolicy: CancellationPolicy.MODERATE,
    priceUnit: PriceUnit.DAY,
    priceMinor: 20000,
    depositMinor: 15000,
  };

  const quote = {
    currency: 'NGN' as const,
    nights: 3,
    priceMinor: 20000,
    rentalFeeMinor: 60000,
    serviceFeeMinor: 3000,
    depositMinor: 15000,
    totalMinor: 78000,
  };

  // Mimics TypeORM assigning a generated UUID PK on first save — real
  // Postgres does this via gen_random_uuid(); this fake just needs to be
  // stable so `saved.id` (used as the payment charge reference) isn't
  // `undefined` throughout the test.
  function fakeRepo() {
    return {
      create: jest.fn((partial: object) => ({ ...partial })),
      save: jest.fn(async (entity: { id?: string }) => ({ id: 'booking-1', ...entity })),
    };
  }

  beforeEach(() => {
    bookingRepository = {
      findByIdOrFail: jest.fn(),
      findByIdempotencyKey: jest.fn(async () => null),
      search: jest.fn(),
    };
    historyRepository = { findByBooking: jest.fn() };
    listingsService = {
      findByIdOrFail: jest.fn(async () => liveListing),
      getQuote: jest.fn(async () => quote),
    };
    paymentPort = {
      charge: jest.fn(async () => ({ providerReference: 'MOCK-REF' })),
      refund: jest.fn(async () => undefined),
      release: jest.fn(async () => undefined),
    };

    const bookingManagerRepo = fakeRepo();
    const historyManagerRepo = fakeRepo();
    const manager = {
      getRepository: jest.fn((entity: unknown) =>
        entity === Booking ? bookingManagerRepo : entity === BookingStatusHistory ? historyManagerRepo : undefined,
      ),
    };
    dataSource = { transaction: jest.fn((cb: (m: unknown) => unknown) => cb(manager)) };

    service = new BookingService(
      dataSource as any,
      bookingRepository as unknown as BookingRepository,
      historyRepository as unknown as BookingStatusHistoryRepository,
      listingsService as unknown as ListingsService,
      paymentPort as unknown as PaymentPort,
    );
  });

  describe('create', () => {
    const dto = { listingId: 'listing-1', from: '2026-08-10T10:00:00Z', to: '2026-08-13T10:00:00Z' };

    it('rejects booking a listing that is not live', async () => {
      listingsService.findByIdOrFail.mockResolvedValue({ ...liveListing, status: ListingStatus.DRAFT });

      await expect(service.create('renter-1', dto)).rejects.toMatchObject({ code: 'LISTING_NOT_LIVE' });
      expect(paymentPort.charge).not.toHaveBeenCalled();
    });

    it('replays the cached booking instead of creating a duplicate for a repeated idempotency key', async () => {
      const existing = { id: 'booking-1' };
      bookingRepository.findByIdempotencyKey.mockResolvedValue(existing);

      const result = await service.create('renter-1', dto, 'idem-key-1');

      expect(result).toBe(existing);
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('leaves a request-to-book listing at requested/pending with no payment captured', async () => {
      const result: any = await service.create('renter-1', dto);

      expect(result.stage).toBe(BookingStage.REQUESTED);
      expect(result.status).toBe(BookingStatus.PENDING);
      expect(paymentPort.charge).not.toHaveBeenCalled();
    });

    it('captures payment and reserves immediately for an instant-book listing', async () => {
      listingsService.findByIdOrFail.mockResolvedValue({ ...liveListing, bookingMode: BookingMode.INSTANT });

      const result: any = await service.create('renter-1', dto);

      expect(paymentPort.charge).toHaveBeenCalledWith({ bookingId: expect.any(String), amountMinor: quote.totalMinor });
      expect(result.stage).toBe(BookingStage.RESERVED);
      expect(result.status).toBe(BookingStatus.CONFIRMED);
    });

    it('snapshots the fee breakdown from the quote onto the booking row, not the live listing price', async () => {
      const result: any = await service.create('renter-1', dto);

      expect(result.rentalFeeMinor).toBe(quote.rentalFeeMinor);
      expect(result.serviceFeeMinor).toBe(quote.serviceFeeMinor);
      expect(result.depositMinor).toBe(quote.depositMinor);
      expect(result.totalMinor).toBe(quote.totalMinor);
    });
  });

  describe('approve', () => {
    it('rejects approving a booking that is not a pending request-to-book', async () => {
      bookingRepository.findByIdOrFail.mockResolvedValue({
        bookingMode: BookingMode.INSTANT,
        status: BookingStatus.PENDING,
      });

      await expect(service.approve('booking-1', 'provider-user-1')).rejects.toMatchObject({
        code: 'BOOKING_NOT_APPROVABLE',
      });
    });

    it('captures payment and reserves on approval of a pending request-to-book booking', async () => {
      bookingRepository.findByIdOrFail.mockResolvedValue({
        id: 'booking-1',
        bookingMode: BookingMode.REQUEST,
        status: BookingStatus.PENDING,
        stage: BookingStage.REQUESTED,
        totalMinor: 78000,
      });

      const result: any = await service.approve('booking-1', 'provider-user-1');

      expect(paymentPort.charge).toHaveBeenCalledWith({ bookingId: 'booking-1', amountMinor: 78000 });
      expect(result.stage).toBe(BookingStage.RESERVED);
      expect(result.status).toBe(BookingStatus.CONFIRMED);
    });
  });

  describe('cancel', () => {
    it('rejects cancelling a booking that has already been picked up', async () => {
      bookingRepository.findByIdOrFail.mockResolvedValue({
        status: BookingStatus.CONFIRMED,
        stage: BookingStage.ACTIVE,
        isBeforePickup: () => false,
      });

      await expect(service.cancel('booking-1', 'user-1')).rejects.toMatchObject({
        code: 'BOOKING_INVALID_STATE_TRANSITION',
      });
      expect(paymentPort.refund).not.toHaveBeenCalled();
    });

    it('refunds a confirmed booking cancelled before pickup', async () => {
      bookingRepository.findByIdOrFail.mockResolvedValue({
        id: 'booking-1',
        status: BookingStatus.CONFIRMED,
        stage: BookingStage.RESERVED,
        totalMinor: 78000,
        isBeforePickup: () => true,
      });

      const result: any = await service.cancel('booking-1', 'user-1', 'change of plans');

      expect(paymentPort.refund).toHaveBeenCalledWith({
        bookingId: 'booking-1',
        amountMinor: 78000,
        reason: 'change of plans',
      });
      expect(result.status).toBe(BookingStatus.CANCELLED);
    });

    it('does not attempt a refund for a pending (never-charged) booking', async () => {
      bookingRepository.findByIdOrFail.mockResolvedValue({
        id: 'booking-1',
        status: BookingStatus.PENDING,
        stage: BookingStage.REQUESTED,
        totalMinor: 78000,
        isBeforePickup: () => true,
      });

      await service.cancel('booking-1', 'user-1');

      expect(paymentPort.refund).not.toHaveBeenCalled();
    });
  });

  describe('confirmHandover', () => {
    it('rejects handover confirmation from a stage before reservation', async () => {
      bookingRepository.findByIdOrFail.mockResolvedValue({ stage: BookingStage.PAYMENT });

      await expect(service.confirmHandover('booking-1', 'provider-user-1')).rejects.toMatchObject({
        code: 'BOOKING_INVALID_STATE_TRANSITION',
      });
    });

    it('advances a reserved booking straight through to active', async () => {
      bookingRepository.findByIdOrFail.mockResolvedValue({ stage: BookingStage.RESERVED, status: BookingStatus.CONFIRMED });

      const result: any = await service.confirmHandover('booking-1', 'provider-user-1');

      expect(result.stage).toBe(BookingStage.ACTIVE);
    });
  });

  describe('releaseDeposit', () => {
    it('rejects releasing a deposit before the item is returned', async () => {
      bookingRepository.findByIdOrFail.mockResolvedValue({ stage: BookingStage.ACTIVE });

      await expect(service.releaseDeposit('booking-1', 'provider-user-1')).rejects.toMatchObject({
        code: 'BOOKING_INVALID_STATE_TRANSITION',
      });
    });

    it('releases the deposit and completes the booking once returned', async () => {
      bookingRepository.findByIdOrFail.mockResolvedValue({
        id: 'booking-1',
        stage: BookingStage.RETURNED,
        status: BookingStatus.CONFIRMED,
        depositMinor: 15000,
      });

      const result: any = await service.releaseDeposit('booking-1', 'provider-user-1');

      expect(paymentPort.release).toHaveBeenCalledWith({ bookingId: 'booking-1', amountMinor: 15000 });
      expect(result.stage).toBe(BookingStage.COMPLETED);
      expect(result.status).toBe(BookingStatus.COMPLETED);
    });

    it('skips the payment release call when there is no deposit', async () => {
      bookingRepository.findByIdOrFail.mockResolvedValue({
        id: 'booking-1',
        stage: BookingStage.RETURNED,
        status: BookingStatus.CONFIRMED,
        depositMinor: 0,
      });

      await service.releaseDeposit('booking-1', 'provider-user-1');

      expect(paymentPort.release).not.toHaveBeenCalled();
    });
  });
});
