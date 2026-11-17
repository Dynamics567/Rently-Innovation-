import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomInt } from 'crypto';
import { DomainException } from '@common/errors/domain.exception';
import { ErrorCode } from '@common/errors/error-codes.enum';
import { AuditLogService } from '@common/audit/audit-log.service';
import { AuditActorType } from '@common/audit/audit-actor-type.enum';
import { DomainEvents } from '@common/events/domain-events';
import { CursorPage } from '@common/dto/cursor-pagination.dto';
import { UsersService } from '@modules/identity/services/users.service';
import { UserRole } from '@modules/identity/enums/user-role.enum';
import { AmbassadorProfileRepository } from '../repositories/ambassador-profile.repository';
import { AmbassadorProfile } from '../entities/ambassador-profile.entity';
import { AmbassadorStatus } from '../enums/ambassador-status.enum';

// No 0/O/1/I — avoids ambiguous referral codes read aloud or over WhatsApp.
const REFERRAL_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const REFERRAL_CODE_LENGTH = 8;
const MAX_CODE_GENERATION_ATTEMPTS = 10;

@Injectable()
export class AmbassadorService {
  constructor(
    private readonly ambassadorRepository: AmbassadorProfileRepository,
    private readonly usersService: UsersService,
    private readonly auditLogService: AuditLogService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /** Idempotent — mirrors ProviderProfileService.createProfile()'s own early return for an existing profile. */
  async register(userId: string): Promise<AmbassadorProfile> {
    const existing = await this.ambassadorRepository.findByUserId(userId);
    if (existing) return existing;

    await this.usersService.addSelfServiceRole(userId, UserRole.AMBASSADOR);

    const referralCode = await this.generateUniqueReferralCode();
    const profile = this.ambassadorRepository.create({
      userId,
      status: AmbassadorStatus.PENDING,
      referralCode,
      agreementAcceptedAt: new Date(),
    });
    const saved = await this.ambassadorRepository.save(profile);
    await this.auditLogService.record({
      actorId: userId,
      actorType: AuditActorType.USER,
      action: 'ambassador_profile.register',
      entityType: 'AmbassadorProfile',
      entityId: saved.id,
      before: null,
      after: { status: saved.status, referralCode: saved.referralCode },
    });
    this.eventEmitter.emit(DomainEvents.AmbassadorRegistered, { recipientId: userId });
    return saved;
  }

  async getByUserId(userId: string): Promise<AmbassadorProfile> {
    const profile = await this.ambassadorRepository.findByUserId(userId);
    if (!profile) {
      throw DomainException.notFound(ErrorCode.RESOURCE_NOT_FOUND, 'No ambassador profile exists for this user.');
    }
    return profile;
  }

  /** [Admin] Attaches the linked user's name/email/phone — Object.assign, same pattern VerificationDocumentsService.listForProvider() uses, so @Exclude() on the entity still applies and the prototype survives. */
  async getById(id: string): Promise<AmbassadorProfile> {
    const profile = await this.ambassadorRepository.findByIdOrFail(id, 'Ambassador profile');
    const [user] = await this.usersService.getBasicProfilesByIds([profile.userId]);
    return Object.assign(profile, { user: user ?? null });
  }

  async search(cursor?: string, limit?: number): Promise<CursorPage<AmbassadorProfile>> {
    const page = await this.ambassadorRepository.search(cursor, limit);
    if (!page.data.length) return page;
    const users = await this.usersService.getBasicProfilesByIds([...new Set(page.data.map((a) => a.userId))]);
    const userById = new Map(users.map((u) => [u.id, u]));
    for (const row of page.data) Object.assign(row, { user: userById.get(row.userId) ?? null });
    return page;
  }

  /**
   * Pending -> Approved only. Approved -> Active is deliberately not wired
   * up here yet — brief §4's lifecycle implies "active" means currently
   * participating, which only means something once Phase 3's points/
   * leaderboard engine exists to drive it (e.g. auto-promote on a
   * qualified referral). Reserved on the enum, not set by any action yet.
   */
  async approve(id: string, adminId: string): Promise<AmbassadorProfile> {
    const profile = await this.ambassadorRepository.findByIdOrFail(id, 'Ambassador profile');
    const before = { status: profile.status };
    profile.status = AmbassadorStatus.APPROVED;
    profile.approvedAt = new Date();
    profile.approvedByAdminId = adminId;
    const saved = await this.ambassadorRepository.save(profile);
    await this.auditLogService.record({
      actorId: adminId,
      actorType: AuditActorType.ADMIN,
      action: 'ambassador_profile.approve',
      entityType: 'AmbassadorProfile',
      entityId: id,
      before,
      after: { status: saved.status },
    });
    this.eventEmitter.emit(DomainEvents.AmbassadorApproved, { recipientId: saved.userId });
    return saved;
  }

  async suspend(id: string, adminId: string, reason: string): Promise<AmbassadorProfile> {
    const profile = await this.ambassadorRepository.findByIdOrFail(id, 'Ambassador profile');
    const before = { status: profile.status };
    profile.status = AmbassadorStatus.SUSPENDED;
    profile.suspendedAt = new Date();
    profile.suspendedReason = reason;
    const saved = await this.ambassadorRepository.save(profile);
    await this.auditLogService.record({
      actorId: adminId,
      actorType: AuditActorType.ADMIN,
      action: 'ambassador_profile.suspend',
      entityType: 'AmbassadorProfile',
      entityId: id,
      before,
      after: { status: saved.status, reason },
    });
    return saved;
  }

  /** Reinstates to Approved (or Pending, if never approved) — no reason required, same asymmetry as UsersService.setStatus(). */
  async reinstate(id: string, adminId: string): Promise<AmbassadorProfile> {
    const profile = await this.ambassadorRepository.findByIdOrFail(id, 'Ambassador profile');
    const before = { status: profile.status };
    profile.status = profile.approvedAt ? AmbassadorStatus.APPROVED : AmbassadorStatus.PENDING;
    profile.suspendedAt = null;
    profile.suspendedReason = null;
    const saved = await this.ambassadorRepository.save(profile);
    await this.auditLogService.record({
      actorId: adminId,
      actorType: AuditActorType.ADMIN,
      action: 'ambassador_profile.reinstate',
      entityType: 'AmbassadorProfile',
      entityId: id,
      before,
      after: { status: saved.status },
    });
    return saved;
  }

  async disqualify(id: string, adminId: string, reason: string): Promise<AmbassadorProfile> {
    const profile = await this.ambassadorRepository.findByIdOrFail(id, 'Ambassador profile');
    const before = { status: profile.status };
    profile.status = AmbassadorStatus.DISQUALIFIED;
    profile.disqualifiedAt = new Date();
    profile.disqualifiedReason = reason;
    const saved = await this.ambassadorRepository.save(profile);
    await this.auditLogService.record({
      actorId: adminId,
      actorType: AuditActorType.ADMIN,
      action: 'ambassador_profile.disqualify',
      entityType: 'AmbassadorProfile',
      entityId: id,
      before,
      after: { status: saved.status, reason },
    });
    return saved;
  }

  private async generateUniqueReferralCode(): Promise<string> {
    for (let attempt = 0; attempt < MAX_CODE_GENERATION_ATTEMPTS; attempt++) {
      let code = '';
      for (let i = 0; i < REFERRAL_CODE_LENGTH; i++) {
        code += REFERRAL_CODE_ALPHABET[randomInt(REFERRAL_CODE_ALPHABET.length)];
      }
      const existing = await this.ambassadorRepository.findByReferralCode(code);
      if (!existing) return code;
    }
    throw new Error('Failed to generate a unique referral code after multiple attempts.');
  }
}
