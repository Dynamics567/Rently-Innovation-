import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { AuditLogService } from '@common/audit/audit-log.service';
import { AuditActorType } from '@common/audit/audit-actor-type.enum';
import {
  BookingLifecycleEventPayload,
  DomainEvents,
  ListingModerationEventPayload,
  ProviderProfileCreatedEventPayload,
  ProviderVerificationEventPayload,
} from '@common/events/domain-events';
import { ReferralAttributionRepository } from '../repositories/referral-attribution.repository';
import { ReferralMilestoneRepository } from '../repositories/referral-milestone.repository';
import { AmbassadorProfileRepository } from '../repositories/ambassador-profile.repository';
import { ReferralMilestoneType } from '../enums/referral-milestone-type.enum';
import { PointsLedgerEntryType } from '../enums/points-ledger-entry-type.enum';
import { MILESTONE_POINTS } from '../constants/milestone-points';
import { PointsLedgerService } from '../services/points-ledger.service';
import { ReferralAttributionService } from '../services/referral-attribution.service';
import { AmbassadorService } from '../services/ambassador.service';

/**
 * Reacts to events Identity/Catalog/Booking already emit for their own
 * reasons — never imports those modules beyond what's already pulled in
 * for ReferralAttributionService (ProviderProfileService, for the
 * existing-provider check). Every payload's recipientId/userId here is
 * the provider's own userId (confirmed at each emit call site), matching
 * how referral attribution is keyed on the referred person.
 */
@Injectable()
export class ReferralMilestoneListener {
  private readonly logger = new Logger(ReferralMilestoneListener.name);

  constructor(
    private readonly attributionRepository: ReferralAttributionRepository,
    private readonly milestoneRepository: ReferralMilestoneRepository,
    private readonly ambassadorRepository: AmbassadorProfileRepository,
    private readonly pointsLedgerService: PointsLedgerService,
    private readonly referralAttributionService: ReferralAttributionService,
    private readonly ambassadorService: AmbassadorService,
    private readonly auditLogService: AuditLogService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @OnEvent(DomainEvents.ProviderProfileCreated)
  async onProviderProfileCreated(payload: ProviderProfileCreatedEventPayload) {
    await this.recordMilestone(payload.userId, ReferralMilestoneType.PROVIDER_REGISTERED);
  }

  @OnEvent(DomainEvents.ProviderVerified)
  async onProviderVerified(payload: ProviderVerificationEventPayload) {
    await this.recordMilestone(payload.recipientId, ReferralMilestoneType.PROVIDER_VERIFIED);
  }

  @OnEvent(DomainEvents.ListingApproved)
  async onListingApproved(payload: ListingModerationEventPayload) {
    await this.recordMilestone(payload.recipientId, ReferralMilestoneType.LISTING_APPROVED);
  }

  @OnEvent(DomainEvents.BookingCreated)
  async onBookingCreated(payload: BookingLifecycleEventPayload) {
    // "First genuine rental inquiry" (brief §7), simplified for this phase
    // to "a real booking request exists" on one of the referred provider's
    // listings — deeper fake/duplicate-inquiry filtering is Phase 7's
    // fraud-review tooling, not this listener.
    await this.recordMilestone(payload.recipientId, ReferralMilestoneType.FIRST_GENUINE_INQUIRY);
  }

  /** Never throws outward — same reasoning as NotificationsModule's deliver(). */
  private async recordMilestone(referredUserId: string, milestoneType: ReferralMilestoneType): Promise<void> {
    try {
      const attribution = await this.attributionRepository.findByReferredUserId(referredUserId);
      if (!attribution) return; // not a referred account — nothing to do

      const milestone = await this.milestoneRepository.recordIfNew(attribution.id, milestoneType);
      if (!milestone) return; // already recorded — idempotent no-op

      await this.auditLogService.record({
        actorId: null,
        actorType: AuditActorType.SYSTEM,
        action: 'referral_milestone.achieve',
        entityType: 'ReferralAttribution',
        entityId: attribution.id,
        before: null,
        after: { milestoneType },
      });

      // Points, qualification, and activation are side effects of this one
      // real milestone — brief §7 (points per milestone), §7 again ("do not
      // award points for an incomplete account" — hence Pending stays
      // Pending until a real milestone lands), and §4's Approved -> Active
      // transition, which this is the concrete trigger for (see
      // AmbassadorService.activateIfApproved()'s own doc comment).
      await this.pointsLedgerService.record({
        ambassadorId: attribution.ambassadorId,
        type: PointsLedgerEntryType.MILESTONE_AWARD,
        pointsDelta: MILESTONE_POINTS[milestoneType],
        sourceEntityType: 'ReferralMilestone',
        sourceEntityId: milestone.id,
      });
      await this.referralAttributionService.markQualified(attribution.id);
      await this.ambassadorService.activateIfApproved(attribution.ambassadorId);

      const ambassador = await this.ambassadorRepository.findByIdOrFail(
        attribution.ambassadorId,
        'Ambassador profile',
      );
      this.eventEmitter.emit(DomainEvents.ReferralMilestoneAchieved, {
        recipientId: ambassador.userId,
        milestoneType,
      });
    } catch (err) {
      this.logger.error(
        `Failed to record referral milestone ${milestoneType} for user ${referredUserId}: ${(err as Error).message}`,
      );
    }
  }
}
