import { ReferralMilestoneListener } from './referral-milestone.listener';
import { ReferralAttributionRepository } from '../repositories/referral-attribution.repository';
import { ReferralMilestoneRepository } from '../repositories/referral-milestone.repository';
import { AmbassadorProfileRepository } from '../repositories/ambassador-profile.repository';
import { PointsLedgerService } from '../services/points-ledger.service';
import { ReferralAttributionService } from '../services/referral-attribution.service';
import { AmbassadorService } from '../services/ambassador.service';
import { AuditLogService } from '@common/audit/audit-log.service';
import { ReferralMilestoneType } from '../enums/referral-milestone-type.enum';
import { MILESTONE_POINTS } from '../constants/milestone-points';

describe('ReferralMilestoneListener', () => {
  let listener: ReferralMilestoneListener;
  let attributionRepository: Record<'findByReferredUserId', jest.Mock>;
  let milestoneRepository: Record<'recordIfNew', jest.Mock>;
  let ambassadorRepository: Record<'findByIdOrFail', jest.Mock>;
  let pointsLedgerService: Record<'record', jest.Mock>;
  let referralAttributionService: Record<'markQualified', jest.Mock>;
  let ambassadorService: Record<'activateIfApproved', jest.Mock>;
  let auditLogService: Record<'record', jest.Mock>;
  let eventEmitter: Record<'emit', jest.Mock>;

  beforeEach(() => {
    attributionRepository = {
      findByReferredUserId: jest.fn(async () => ({ id: 'attribution-1', ambassadorId: 'ambassador-1' })),
    };
    milestoneRepository = { recordIfNew: jest.fn(async () => ({ id: 'milestone-1' })) };
    ambassadorRepository = { findByIdOrFail: jest.fn(async () => ({ id: 'ambassador-1', userId: 'ambassador-user-1' })) };
    pointsLedgerService = { record: jest.fn(async () => undefined) };
    referralAttributionService = { markQualified: jest.fn(async () => undefined) };
    ambassadorService = { activateIfApproved: jest.fn(async () => undefined) };
    auditLogService = { record: jest.fn(async () => undefined) };
    eventEmitter = { emit: jest.fn() };
    listener = new ReferralMilestoneListener(
      attributionRepository as unknown as ReferralAttributionRepository,
      milestoneRepository as unknown as ReferralMilestoneRepository,
      ambassadorRepository as unknown as AmbassadorProfileRepository,
      pointsLedgerService as unknown as PointsLedgerService,
      referralAttributionService as unknown as ReferralAttributionService,
      ambassadorService as unknown as AmbassadorService,
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

  it('records the milestone, awards points, qualifies the referral, activates the ambassador, audit-logs, and notifies on a first occurrence', async () => {
    await listener.onProviderVerified({ recipientId: 'referred-user-1', businessName: 'Acme Rentals' });

    expect(milestoneRepository.recordIfNew).toHaveBeenCalledWith('attribution-1', ReferralMilestoneType.PROVIDER_VERIFIED);
    expect(pointsLedgerService.record).toHaveBeenCalledWith({
      ambassadorId: 'ambassador-1',
      type: 'milestone_award',
      pointsDelta: MILESTONE_POINTS[ReferralMilestoneType.PROVIDER_VERIFIED],
      sourceEntityType: 'ReferralMilestone',
      sourceEntityId: 'milestone-1',
    });
    expect(referralAttributionService.markQualified).toHaveBeenCalledWith('attribution-1');
    expect(ambassadorService.activateIfApproved).toHaveBeenCalledWith('ambassador-1');
    expect(auditLogService.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'referral_milestone.achieve', entityId: 'attribution-1' }),
    );
    expect(eventEmitter.emit).toHaveBeenCalledWith('referral.milestone_achieved', {
      recipientId: 'ambassador-user-1',
      milestoneType: ReferralMilestoneType.PROVIDER_VERIFIED,
    });
  });

  it('is idempotent — a duplicate milestone (recordIfNew returns null) never awards points, qualifies, activates, re-audit-logs or re-notifies', async () => {
    milestoneRepository.recordIfNew.mockResolvedValue(null);

    await listener.onListingApproved({ recipientId: 'referred-user-1', listingId: 'l1', listingTitle: 'Generator' });

    expect(pointsLedgerService.record).not.toHaveBeenCalled();
    expect(referralAttributionService.markQualified).not.toHaveBeenCalled();
    expect(ambassadorService.activateIfApproved).not.toHaveBeenCalled();
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
