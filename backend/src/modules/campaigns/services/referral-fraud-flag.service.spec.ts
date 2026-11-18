import { ReferralFraudFlagService } from './referral-fraud-flag.service';
import { ReferralFraudFlagRepository } from '../repositories/referral-fraud-flag.repository';
import { AuditLogService } from '@common/audit/audit-log.service';

describe('ReferralFraudFlagService', () => {
  let flagRepository: Record<
    'create' | 'save' | 'search' | 'countOpen' | 'findByIdOrFail',
    jest.Mock
  >;
  let auditLogService: Record<'record', jest.Mock>;
  let service: ReferralFraudFlagService;

  beforeEach(() => {
    flagRepository = {
      create: jest.fn((partial) => partial),
      save: jest.fn(async (entity) => ({ ...entity, id: 'flag-1' })),
      search: jest.fn(async () => ({ data: [], meta: { hasMore: false, nextCursor: null } })),
      countOpen: jest.fn(async () => 0),
      findByIdOrFail: jest.fn(async () => ({ id: 'flag-1', acknowledgedAt: null })),
    };
    auditLogService = { record: jest.fn(async () => undefined) };
    service = new ReferralFraudFlagService(
      flagRepository as unknown as ReferralFraudFlagRepository,
      auditLogService as unknown as AuditLogService,
    );
  });

  it('persists a flag with no audit log — this is a background record, not an admin action', async () => {
    await service.flag({
      referralCode: 'ABC',
      attemptedUserId: 'user-1',
      reasonCode: 'REFERRAL_SELF_REFERRAL',
      message: 'nope',
    });
    expect(flagRepository.save).toHaveBeenCalled();
    expect(auditLogService.record).not.toHaveBeenCalled();
  });

  it('acknowledging stamps the admin and timestamp, and is audit-logged since it is an explicit admin action', async () => {
    const saved = await service.acknowledge('flag-1', 'admin-1');
    expect(saved.acknowledgedByAdminId).toBe('admin-1');
    expect(saved.acknowledgedAt).toBeInstanceOf(Date);
    expect(auditLogService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'referral_fraud_flag.acknowledge',
        entityId: 'flag-1',
        actorId: 'admin-1',
      }),
    );
  });

  it('defaults to open-only when searching', async () => {
    await service.search(true, undefined, 20);
    expect(flagRepository.search).toHaveBeenCalledWith(true, undefined, 20);
  });
});
