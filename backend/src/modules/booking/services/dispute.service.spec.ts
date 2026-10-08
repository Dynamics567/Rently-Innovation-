import { DisputeService } from './dispute.service';
import { DisputeRepository } from '../repositories/dispute.repository';
import { BookingService } from './booking.service';
import { AuditLogService } from '@common/audit/audit-log.service';
import { DisputeStatus } from '../enums/dispute-status.enum';

/**
 * Unit-level, same shape as the other *.service.spec.ts files in this repo.
 * This file didn't exist before Phase C — it covers the one thing that
 * changed: findByIdOrFail() now resolves evidenceKeys into signed URLs
 * instead of returning the raw entity, the same Object.assign technique
 * VerificationDocumentsService.listForProvider() already uses.
 */
describe('DisputeService', () => {
  let service: DisputeService;
  let disputeRepository: Record<'findByIdOrFail' | 'save' | 'findByBooking' | 'findAll', jest.Mock>;
  let bookingService: Record<'findByIdOrFail' | 'finalizeDispute' | 'emitDisputeResolvedEvent', jest.Mock>;
  let auditLogService: Record<'record', jest.Mock>;
  let storage: Record<'getUrl' | 'upload' | 'delete', jest.Mock>;
  let dataSource: { transaction: jest.Mock };

  beforeEach(() => {
    disputeRepository = {
      findByIdOrFail: jest.fn(),
      save: jest.fn(async (d: unknown) => d),
      findByBooking: jest.fn(),
      findAll: jest.fn(),
    };
    bookingService = {
      findByIdOrFail: jest.fn(async () => ({ id: 'booking-1', depositMinor: 15000 })),
      finalizeDispute: jest.fn(),
      emitDisputeResolvedEvent: jest.fn(async () => undefined),
    };
    auditLogService = { record: jest.fn(async () => undefined) };
    storage = {
      getUrl: jest.fn(async (key: string) => `https://signed.example.com/${key}`),
      upload: jest.fn(),
      delete: jest.fn(),
    };
    dataSource = { transaction: jest.fn((cb: (m: unknown) => unknown) => cb({ getRepository: () => disputeRepository })) };

    service = new DisputeService(
      dataSource as any,
      disputeRepository as unknown as DisputeRepository,
      bookingService as unknown as BookingService,
      auditLogService as unknown as AuditLogService,
      storage as unknown as any,
    );
  });

  describe('findByIdOrFail', () => {
    it('resolves each evidence key into a signed URL', async () => {
      disputeRepository.findByIdOrFail.mockResolvedValue({
        id: 'dispute-1',
        status: DisputeStatus.OPEN,
        evidenceKeys: ['inspection-evidence/booking-1/a', 'inspection-evidence/booking-1/b'],
      });

      const result = await service.findByIdOrFail('dispute-1');

      expect(storage.getUrl).toHaveBeenCalledTimes(2);
      expect(result.evidenceUrls).toEqual([
        { key: 'inspection-evidence/booking-1/a', url: 'https://signed.example.com/inspection-evidence/booking-1/a' },
        { key: 'inspection-evidence/booking-1/b', url: 'https://signed.example.com/inspection-evidence/booking-1/b' },
      ]);
      // Object.assign, not a spread -- the returned value is still a Dispute, not a stripped plain object.
      expect(result.id).toBe('dispute-1');
    });

    it('returns an empty evidenceUrls array when no evidence was attached', async () => {
      disputeRepository.findByIdOrFail.mockResolvedValue({
        id: 'dispute-1',
        status: DisputeStatus.OPEN,
        evidenceKeys: [],
      });

      const result = await service.findByIdOrFail('dispute-1');

      expect(storage.getUrl).not.toHaveBeenCalled();
      expect(result.evidenceUrls).toEqual([]);
    });
  });

  describe('findByBooking', () => {
    it('also resolves evidence URLs — a renter looking up their own dispute needs to see it too', async () => {
      disputeRepository.findByBooking.mockResolvedValue({
        id: 'dispute-1',
        status: DisputeStatus.OPEN,
        evidenceKeys: ['inspection-evidence/booking-1/a'],
      });

      const result = await service.findByBooking('booking-1');

      expect(result?.evidenceUrls).toEqual([
        { key: 'inspection-evidence/booking-1/a', url: 'https://signed.example.com/inspection-evidence/booking-1/a' },
      ]);
    });

    it('returns null as-is when there is no dispute on the booking', async () => {
      disputeRepository.findByBooking.mockResolvedValue(null);

      await expect(service.findByBooking('booking-1')).resolves.toBeNull();
      expect(storage.getUrl).not.toHaveBeenCalled();
    });
  });
});
