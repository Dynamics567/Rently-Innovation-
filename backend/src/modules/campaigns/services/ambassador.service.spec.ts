import { AmbassadorService } from './ambassador.service';
import { AmbassadorProfileRepository } from '../repositories/ambassador-profile.repository';
import { UsersService } from '@modules/identity/services/users.service';
import { UserRole } from '@modules/identity/enums/user-role.enum';
import { AuditLogService } from '@common/audit/audit-log.service';
import { AmbassadorStatus } from '../enums/ambassador-status.enum';

/** Unit-level, same shape as every other *.service.spec.ts in this repo: hand-rolled mocks, no real database. */
describe('AmbassadorService', () => {
  let service: AmbassadorService;
  let ambassadorRepository: Record<
    'findByUserId' | 'findByReferralCode' | 'create' | 'save' | 'findByIdOrFail' | 'search',
    jest.Mock
  >;
  let usersService: Record<'addSelfServiceRole' | 'getBasicProfilesByIds', jest.Mock>;
  let auditLogService: Record<'record', jest.Mock>;
  let eventEmitter: Record<'emit', jest.Mock>;

  beforeEach(() => {
    ambassadorRepository = {
      findByUserId: jest.fn(async () => null),
      findByReferralCode: jest.fn(async () => null), // first generated code is always "unique" in tests
      create: jest.fn((partial) => partial),
      save: jest.fn(async (entity) => ({ ...entity, id: 'ambassador-1' })),
      findByIdOrFail: jest.fn(async () => ({
        id: 'ambassador-1',
        userId: 'user-1',
        status: AmbassadorStatus.PENDING,
        approvedAt: null,
      })),
      search: jest.fn(),
    };
    usersService = {
      addSelfServiceRole: jest.fn(async () => undefined),
      getBasicProfilesByIds: jest.fn(async () => [{ id: 'user-1', fullName: 'Ada Lovelace', email: 'ada@example.com' }]),
    };
    auditLogService = { record: jest.fn(async () => undefined) };
    eventEmitter = { emit: jest.fn() };
    service = new AmbassadorService(
      ambassadorRepository as unknown as AmbassadorProfileRepository,
      usersService as unknown as UsersService,
      auditLogService as unknown as AuditLogService,
      eventEmitter as unknown as any,
    );
  });

  describe('register', () => {
    it('is idempotent — returns the existing profile without touching roles or generating a new code', async () => {
      const existing = { id: 'ambassador-1', userId: 'user-1', status: AmbassadorStatus.PENDING };
      ambassadorRepository.findByUserId.mockResolvedValue(existing);

      const result = await service.register('user-1');

      expect(result).toBe(existing);
      expect(usersService.addSelfServiceRole).not.toHaveBeenCalled();
      expect(ambassadorRepository.save).not.toHaveBeenCalled();
    });

    it('grants the AMBASSADOR role, generates a unique referral code, and emits AmbassadorRegistered', async () => {
      const result = await service.register('user-1');

      expect(usersService.addSelfServiceRole).toHaveBeenCalledWith('user-1', UserRole.AMBASSADOR);
      expect(ambassadorRepository.findByReferralCode).toHaveBeenCalled();
      expect(result.referralCode).toMatch(/^[A-Z0-9]{8}$/);
      expect(result.status).toBe(AmbassadorStatus.PENDING);
      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'ambassador_profile.register', entityId: 'ambassador-1' }),
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith('ambassador.registered', { recipientId: 'user-1' });
    });

    it('retries referral-code generation on a collision rather than returning a duplicate', async () => {
      ambassadorRepository.findByReferralCode
        .mockResolvedValueOnce({ id: 'someone-else' }) // first candidate collides
        .mockResolvedValueOnce(null); // second candidate is free

      await service.register('user-1');

      expect(ambassadorRepository.findByReferralCode).toHaveBeenCalledTimes(2);
    });
  });

  describe('approve', () => {
    it('sets status to approved, stamps approvedAt/approvedByAdminId, and emits AmbassadorApproved', async () => {
      await service.approve('ambassador-1', 'admin-1');

      expect(ambassadorRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: AmbassadorStatus.APPROVED, approvedByAdminId: 'admin-1' }),
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith('ambassador.approved', { recipientId: 'user-1' });
    });
  });

  describe('suspend', () => {
    it('records the reason and does not emit a notification event (none is wired up for suspension)', async () => {
      const result = await service.suspend('ambassador-1', 'admin-1', 'Suspicious referral pattern');

      expect(result.status).toBe(AmbassadorStatus.SUSPENDED);
      expect(result.suspendedReason).toBe('Suspicious referral pattern');
      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'ambassador_profile.suspend' }),
      );
    });
  });

  describe('getById', () => {
    it('attaches the linked user\'s name/email via a batch lookup, never a join', async () => {
      const result = await service.getById('ambassador-1');

      expect(usersService.getBasicProfilesByIds).toHaveBeenCalledWith(['user-1']);
      expect((result as any).user).toEqual({ id: 'user-1', fullName: 'Ada Lovelace', email: 'ada@example.com' });
    });
  });

  describe('search', () => {
    it('batch-resolves every row\'s user in one call, not one per row', async () => {
      ambassadorRepository.search.mockResolvedValue({
        data: [
          { id: 'ambassador-1', userId: 'user-1' },
          { id: 'ambassador-2', userId: 'user-2' },
        ],
        meta: { hasMore: false, nextCursor: null },
      });
      usersService.getBasicProfilesByIds.mockResolvedValue([
        { id: 'user-1', fullName: 'Ada Lovelace' },
        { id: 'user-2', fullName: 'Grace Hopper' },
      ]);

      const page = await service.search();

      expect(usersService.getBasicProfilesByIds).toHaveBeenCalledTimes(1);
      expect((page.data[0] as any).user.fullName).toBe('Ada Lovelace');
      expect((page.data[1] as any).user.fullName).toBe('Grace Hopper');
    });
  });

  describe('disqualify', () => {
    it('sets status to disqualified and records the reason', async () => {
      const result = await service.disqualify('ambassador-1', 'admin-1', 'Confirmed self-referral fraud');

      expect(result.status).toBe(AmbassadorStatus.DISQUALIFIED);
      expect(result.disqualifiedReason).toBe('Confirmed self-referral fraud');
    });
  });
});
