import { ReferralMilestoneListener } from './referral-milestone.listener';
import { ReferralAttributionRepository } from '../repositories/referral-attribution.repository';
import { ReferralMilestoneRepository } from '../repositories/referral-milestone.repository';
import { AmbassadorProfileRepository } from '../repositories/ambassador-profile.repository';
import { AuditLogService } from '@common/audit/audit-log.service';
import { ReferralMilestoneType } from '../enums/referral-milestone-type.enum';

describe('ReferralMilestoneListener', () => {
  let listener: ReferralMilestoneListener;
  let attributionRepository: Record<'findByReferredUserId', jest.Mock>;
  let milestoneRepository: Record<'recordIfNew', jest.Mock>;
  let ambassadorRepository: Record<'findByIdOrFail', jest.Mock>;
  let auditLogService: Record<'record', jest.Mock>;
  let eventEmitter: Record<'emit', jest.Mock>;

  beforeEach(() => {
    attributionRepository = {
      findByReferredUserId: jest.fn(async () => ({ id: 'attribution-1', ambassadorId: 'ambassador-1' })),
    };
    milestoneRepository = { recordIfNew: jest.fn(async () => ({ id: 'milestone-1' })) };
    ambassadorRepository = { findByIdOrFail: jest.fn(async () => ({ id: 'ambassador-1', userId: 'ambassador-user-1' })) };
    auditLogService = { record: jest.fn(async () => undefined) };
    eventEmitter = { emit: jest.fn() };
    listener = new ReferralMilestoneListener(
      attributionRepository as unknown as ReferralAttributionRepository,
      milestoneRepository as unknown as ReferralMilestoneRepository,
      ambassadorRepository as unknown as AmbassadorProfileRepository,
      auditLogService as unknown as AuditLogService,
      eventEmitter as unknown as any,
    );
  });

  it('does nothing when the acting user has no referral attribution at all', async () => {
    attributionRepository.findByReferredUserId.mockResolvedValue(null);

    await listener.onProviderVerified({ recipientId: 'not-referred-user', businessName: null });

    expect(milestoneRepository.recordIfNew).not.toHaveBeenCalled();
    expect(eventEmitter.emit).not.toHaveBeenCalled();
  });

  it('records the milestone, audit-logs it, and emits ReferralMilestoneAchieved to the ambassador on a first occurrence', async () => {
    await listener.onProviderVerified({ recipientId: 'referred-user-1', businessName: 'Acme Rentals' });

    expect(milestoneRepository.recordIfNew).toHaveBeenCalledWith('attribution-1', ReferralMilestoneType.PROVIDER_VERIFIED);
    expect(auditLogService.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'referral_milestone.achieve', entityId: 'attribution-1' }),
    );
    expect(eventEmitter.emit).toHaveBeenCalledWith('referral.milestone_achieved', {
      recipientId: 'ambassador-user-1',
      milestoneType: ReferralMilestoneType.PROVIDER_VERIFIED,
    });
  });

  it('is idempotent — a duplicate milestone (recordIfNew returns null) never re-audit-logs or re-notifies', async () => {
    milestoneRepository.recordIfNew.mockResolvedValue(null);

    await listener.onListingApproved({ recipientId: 'referred-user-1', listingId: 'l1', listingTitle: 'Generator' });

    expect(auditLogService.record).not.toHaveBeenCalled();
    expect(eventEmitter.emit).not.toHaveBeenCalled();
  });

  it('never throws outward, even when a lookup fails mid-way', async () => {
    ambassadorRepository.findByIdOrFail.mockRejectedValue(new Error('db exploded'));

    await expect(
      listener.onBookingCreated({ bookingId: 'b1', recipientId: 'referred-user-1', listingTitle: 'Generator' }),
    ).resolves.toBeUndefined();
  });
});
