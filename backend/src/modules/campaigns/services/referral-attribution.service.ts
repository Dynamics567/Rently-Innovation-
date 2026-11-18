import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DomainException } from '@common/errors/domain.exception';
import { ErrorCode } from '@common/errors/error-codes.enum';
import { AuditLogService } from '@common/audit/audit-log.service';
import { AuditActorType } from '@common/audit/audit-actor-type.enum';
import { DomainEvents } from '@common/events/domain-events';
import { CursorPage } from '@common/dto/cursor-pagination.dto';
import { ProviderProfileService } from '@modules/identity/services/provider-profile.service';
import { UsersService } from '@modules/identity/services/users.service';
import { AmbassadorProfileRepository } from '../repositories/ambassador-profile.repository';
import { ReferralAttributionRepository } from '../repositories/referral-attribution.repository';
import { ReferralAttribution } from '../entities/referral-attribution.entity';
import { AmbassadorProfile } from '../entities/ambassador-profile.entity';
import { ReferralSource } from '../enums/referral-source.enum';
import { ReferralStatus } from '../enums/referral-status.enum';

@Injectable()
export class ReferralAttributionService {
  constructor(
    private readonly attributionRepository: ReferralAttributionRepository,
    private readonly ambassadorRepository: AmbassadorProfileRepository,
    private readonly providerProfileService: ProviderProfileService,
    private readonly usersService: UsersService,
    private readonly auditLogService: AuditLogService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * The link/manual-code path (brief §6) — resolves a code to its
   * ambassador, then runs the same rule set manualAttribute() does. Throws
   * on every rule violation; SignupReferralListener (the only caller for
   * source=LINK) swallows that, since a bad code must never block a signup.
   */
  async attribute(referralCode: string, referredUserId: string, source: ReferralSource): Promise<ReferralAttribution> {
    const ambassador = await this.ambassadorRepository.findByReferralCode(referralCode);
    if (!ambassador) {
      throw DomainException.notFound(ErrorCode.REFERRAL_CODE_INVALID, 'This referral code does not exist.');
    }
    return this.createAttribution(ambassador, referredUserId, referralCode, source);
  }

  /** [Admin] Manual override (brief §6 rule 6) — by ambassador id, not code, since an admin is acting on a specific ambassador's behalf, not redeeming a link. */
  async manualAttribute(
    ambassadorId: string,
    referredUserId: string,
    adminId: string,
    reason: string,
  ): Promise<ReferralAttribution> {
    const ambassador = await this.ambassadorRepository.findByIdOrFail(ambassadorId, 'Ambassador profile');
    const attribution = await this.createAttribution(
      ambassador,
      referredUserId,
      ambassador.referralCode,
      ReferralSource.ADMIN,
      adminId,
    );
    await this.auditLogService.record({
      actorId: adminId,
      actorType: AuditActorType.ADMIN,
      action: 'referral_attribution.manual_attribute',
      entityType: 'ReferralAttribution',
      entityId: attribution.id,
      before: null,
      after: { ambassadorId, referredUserId, reason },
    });
    return attribution;
  }

  async reject(id: string, adminId: string, reason: string): Promise<ReferralAttribution> {
    const attribution = await this.attributionRepository.findByIdOrFail(id, 'Referral attribution');
    const ambassador = await this.ambassadorRepository.findByIdOrFail(attribution.ambassadorId, 'Ambassador profile');
    const before = { status: attribution.status };
    attribution.status = ReferralStatus.REJECTED;
    attribution.rejectionReason = reason;
    const saved = await this.attributionRepository.save(attribution);
    await this.auditLogService.record({
      actorId: adminId,
      actorType: AuditActorType.ADMIN,
      action: 'referral_attribution.reject',
      entityType: 'ReferralAttribution',
      entityId: id,
      before,
      after: { status: saved.status, reason },
    });
    this.eventEmitter.emit(DomainEvents.ReferralRejected, { recipientId: ambassador.userId, reason });
    return saved;
  }

  /**
   * Idempotent — only ever moves Pending -> Qualified, never touches an
   * already-qualified/rejected/reversed row. Called by
   * ReferralMilestoneListener the moment a referral's first real
   * milestone lands — brief §7: "do not award points simply because a
   * user clicks a referral link or creates an incomplete account," so a
   * referral stays Pending until something real actually happens.
   */
  async markQualified(id: string): Promise<void> {
    const attribution = await this.attributionRepository.findByIdOrFail(id, 'Referral attribution');
    if (attribution.status !== ReferralStatus.PENDING) return;
    const before = { status: attribution.status };
    attribution.status = ReferralStatus.QUALIFIED;
    const saved = await this.attributionRepository.save(attribution);
    await this.auditLogService.record({
      actorId: null,
      actorType: AuditActorType.SYSTEM,
      action: 'referral_attribution.qualify',
      entityType: 'ReferralAttribution',
      entityId: id,
      before,
      after: { status: saved.status },
    });
  }

  async getById(id: string): Promise<ReferralAttribution> {
    return this.attributionRepository.findByIdOrFail(id, 'Referral attribution');
  }

  async findByReferredUserId(referredUserId: string): Promise<ReferralAttribution | null> {
    return this.attributionRepository.findByReferredUserId(referredUserId);
  }

  /** [Admin] Attaches the referred person's name and the referring ambassador's name — two small batch lookups, never a per-row query, same Object.assign pattern as AmbassadorService.search(). */
  async search(ambassadorId?: string, cursor?: string, limit?: number): Promise<CursorPage<ReferralAttribution>> {
    const page = await this.attributionRepository.search(ambassadorId, cursor, limit);
    if (!page.data.length) return page;

    const ambassadorIds = [...new Set(page.data.map((r) => r.ambassadorId))];
    const ambassadors = (
      await Promise.all(ambassadorIds.map((id) => this.ambassadorRepository.findById(id)))
    ).filter((a): a is AmbassadorProfile => !!a);
    const ambassadorById = new Map(ambassadors.map((a) => [a.id, a]));

    const userIds = [...page.data.map((r) => r.referredUserId), ...ambassadors.map((a) => a.userId)];
    const users = await this.usersService.getBasicProfilesByIds([...new Set(userIds)]);
    const userById = new Map(users.map((u) => [u.id, u]));

    for (const row of page.data) {
      const ambassador = ambassadorById.get(row.ambassadorId);
      Object.assign(row, {
        referredUser: userById.get(row.referredUserId) ?? null,
        ambassadorName: ambassador ? (userById.get(ambassador.userId)?.fullName ?? null) : null,
      });
    }
    return page;
  }

  private async createAttribution(
    ambassador: AmbassadorProfile,
    referredUserId: string,
    referralCode: string,
    source: ReferralSource,
    adminId?: string,
  ): Promise<ReferralAttribution> {
    if (ambassador.userId === referredUserId) {
      throw DomainException.conflict(ErrorCode.REFERRAL_SELF_REFERRAL, 'An ambassador cannot refer themselves.');
    }

    const existingAttribution = await this.attributionRepository.findByReferredUserId(referredUserId);
    if (existingAttribution) {
      throw DomainException.conflict(
        ErrorCode.REFERRAL_ALREADY_ATTRIBUTED,
        'This account is already attributed to an ambassador.',
      );
    }

    // Only meaningful for the manual-attribute path in practice — a
    // signup-triggered attribution's referredUserId is a brand-new account
    // that cannot yet have a ProviderProfile. Kept as one shared rule
    // rather than two code paths. Brief §6 rule 2.
    const alreadyProvider = await this.providerProfileService.existsForUser(referredUserId);
    if (alreadyProvider) {
      throw DomainException.conflict(
        ErrorCode.REFERRAL_EXISTING_PROVIDER,
        'An existing Rental Partner does not qualify as a new referral.',
      );
    }

    const row = this.attributionRepository.create({
      ambassadorId: ambassador.id,
      referredUserId,
      referralCode,
      source,
      attributedByAdminId: adminId ?? null,
      status: ReferralStatus.PENDING,
    });
    const saved = await this.attributionRepository.save(row);
    await this.auditLogService.record({
      actorId: adminId ?? referredUserId,
      actorType: adminId ? AuditActorType.ADMIN : AuditActorType.SYSTEM,
      action: 'referral_attribution.create',
      entityType: 'ReferralAttribution',
      entityId: saved.id,
      before: null,
      after: { ambassadorId: ambassador.id, referredUserId, source },
    });
    this.eventEmitter.emit(DomainEvents.ReferralAttributed, { recipientId: ambassador.userId });
    return saved;
  }
}
