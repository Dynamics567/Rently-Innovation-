import { ReferralAttributionService } from './referral-attribution.service';
import { ReferralAttributionRepository } from '../repositories/referral-attribution.repository';
import { AmbassadorProfileRepository } from '../repositories/ambassador-profile.repository';
import { ProviderProfileService } from '@modules/identity/services/provider-profile.service';
import { UsersService } from '@modules/identity/services/users.service';
import { AuditLogService } from '@common/audit/audit-log.service';
import { ReferralSource } from '../enums/referral-source.enum';
import { ReferralStatus } from '../enums/referral-status.enum';

const AMBASSADOR = { id: 'ambassador-1', userId: 'ambassador-user-1', referralCode: 'ABCD1234' };

describe('ReferralAttributionService', () => {
  let service: ReferralAttributionService;
  let attributionRepository: Record<'findByReferredUserId' | 'create' | 'save' | 'findByIdOrFail' | 'search', jest.Mock>;
  let ambassadorRepository: Record<'findByReferralCode' | 'findByIdOrFail' | 'findById', jest.Mock>;
  let providerProfileService: Record<'existsForUser', jest.Mock>;
  let usersService: Record<'getBasicProfilesByIds', jest.Mock>;
  let auditLogService: Record<'record', jest.Mock>;
  let eventEmitter: Record<'emit', jest.Mock>;

  beforeEach(() => {
    attributionRepository = {
      findByReferredUserId: jest.fn(async () => null),
      create: jest.fn((partial) => partial),
      save: jest.fn(async (entity) => ({ ...entity, id: 'attribution-1' })),
      findByIdOrFail: jest.fn(async () => ({
        id: 'attribution-1',
        ambassadorId: AMBASSADOR.id,
        status: ReferralStatus.PENDING,
      })),
      search: jest.fn(),
    };
    ambassadorRepository = {
      findByReferralCode: jest.fn(async () => AMBASSADOR),
      findByIdOrFail: jest.fn(async () => AMBASSADOR),
      findById: jest.fn(async () => AMBASSADOR),
    };
    providerProfileService = { existsForUser: jest.fn(async () => false) };
    usersService = { getBasicProfilesByIds: jest.fn(async () => []) };
    auditLogService = { record: jest.fn(async () => undefined) };
    eventEmitter = { emit: jest.fn() };
    service = new ReferralAttributionService(
      attributionRepository as unknown as ReferralAttributionRepository,
      ambassadorRepository as unknown as AmbassadorProfileRepository,
      providerProfileService as unknown as ProviderProfileService,
      usersService as unknown as UsersService,
      auditLogService as unknown as AuditLogService,
      eventEmitter as unknown as any,
    );
  });

  describe('attribute', () => {
    it('rejects an unknown referral code', async () => {
      ambassadorRepository.findByReferralCode.mockResolvedValue(null);

      await expect(service.attribute('NOPE0000', 'referred-user-1', ReferralSource.LINK)).rejects.toMatchObject({
        code: 'REFERRAL_CODE_INVALID',
      });
      expect(attributionRepository.save).not.toHaveBeenCalled();
    });

    it('rejects an ambassador referring themselves', async () => {
      await expect(
        service.attribute('ABCD1234', AMBASSADOR.userId, ReferralSource.LINK),
      ).rejects.toMatchObject({ code: 'REFERRAL_SELF_REFERRAL' });
      expect(attributionRepository.save).not.toHaveBeenCalled();
    });

    it('rejects a referred user who is already attributed to an ambassador', async () => {
      attributionRepository.findByReferredUserId.mockResolvedValue({ id: 'existing-attribution' });

      await expect(
        service.attribute('ABCD1234', 'referred-user-1', ReferralSource.LINK),
      ).rejects.toMatchObject({ code: 'REFERRAL_ALREADY_ATTRIBUTED' });
      expect(attributionRepository.save).not.toHaveBeenCalled();
    });

    it('rejects a referred user who is already an existing provider', async () => {
      providerProfileService.existsForUser.mockResolvedValue(true);

      await expect(
        service.attribute('ABCD1234', 'referred-user-1', ReferralSource.LINK),
      ).rejects.toMatchObject({ code: 'REFERRAL_EXISTING_PROVIDER' });
      expect(attributionRepository.save).not.toHaveBeenCalled();
    });

    it('creates a pending attribution and notifies the ambassador on a clean referral', async () => {
      const result = await service.attribute('ABCD1234', 'referred-user-1', ReferralSource.LINK);

      expect(result.status).toBe(ReferralStatus.PENDING);
      expect(attributionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ ambassadorId: AMBASSADOR.id, referredUserId: 'referred-user-1', source: ReferralSource.LINK }),
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith('referral.attributed', { recipientId: AMBASSADOR.userId });
    });
  });

  describe('manualAttribute', () => {
    it('creates the attribution with source=admin and writes its own audit entry carrying the reason', async () => {
      await service.manualAttribute(AMBASSADOR.id, 'referred-user-1', 'admin-1', 'Verified offline, add retroactively');

      expect(attributionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ source: 'admin', attributedByAdminId: 'admin-1' }),
      );
      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'referral_attribution.manual_attribute',
          after: expect.objectContaining({ reason: 'Verified offline, add retroactively' }),
        }),
      );
    });
  });

  describe('search', () => {
    it('attaches the referred user\'s name and the referring ambassador\'s name via batch lookups', async () => {
      attributionRepository.search.mockResolvedValue({
        data: [{ id: 'attribution-1', ambassadorId: AMBASSADOR.id, referredUserId: 'referred-user-1' }],
        meta: { hasMore: false, nextCursor: null },
      });
      ambassadorRepository.findById.mockResolvedValue(AMBASSADOR);
      usersService.getBasicProfilesByIds.mockResolvedValue([
        { id: 'referred-user-1', fullName: 'Chinwe Okoro' },
        { id: AMBASSADOR.userId, fullName: 'Ada Lovelace' },
      ]);

      const page = await service.search();

      expect(usersService.getBasicProfilesByIds).toHaveBeenCalledTimes(1);
      expect((page.data[0] as any).referredUser.fullName).toBe('Chinwe Okoro');
      expect((page.data[0] as any).ambassadorName).toBe('Ada Lovelace');
    });
  });

  describe('reject', () => {
    it('sets status to rejected, stores the reason, and notifies the ambassador', async () => {
      const result = await service.reject('attribution-1', 'admin-1', 'Duplicate account');

      expect(result.status).toBe(ReferralStatus.REJECTED);
      expect(result.rejectionReason).toBe('Duplicate account');
      expect(eventEmitter.emit).toHaveBeenCalledWith('referral.rejected', {
        recipientId: AMBASSADOR.userId,
        reason: 'Duplicate account',
      });
    });
  });

  describe('markQualified', () => {
    it('promotes Pending to Qualified and audit-logs as the system actor', async () => {
      await service.markQualified('attribution-1');

      expect(attributionRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: ReferralStatus.QUALIFIED }),
      );
      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'referral_attribution.qualify', actorId: null }),
      );
    });

    it('is a no-op for any status other than Pending', async () => {
      attributionRepository.findByIdOrFail.mockResolvedValue({ id: 'attribution-1', status: ReferralStatus.REJECTED });

      await service.markQualified('attribution-1');

      expect(attributionRepository.save).not.toHaveBeenCalled();
    });
  });
});
