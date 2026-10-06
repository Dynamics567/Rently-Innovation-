import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes, createHash } from 'crypto';
import { DomainException } from '@common/errors/domain.exception';
import { ErrorCode } from '@common/errors/error-codes.enum';
import { CursorPage } from '@common/dto/cursor-pagination.dto';
import { AuditLogService } from '@common/audit/audit-log.service';
import { AuditActorType } from '@common/audit/audit-actor-type.enum';
import { AppConfig } from '@config/configuration';
import { UserRepository } from '../repositories/user.repository';
import { AdminInviteRepository } from '../repositories/admin-invite.repository';
import { User } from '../entities/user.entity';
import { AdminInvite } from '../entities/admin-invite.entity';
import { UserRole } from '../enums/user-role.enum';
import { UserAccountStatus } from '../enums/verification-status.enum';
import { EMAIL_SENDER, EmailSender } from './email-sender.port';

const ADMIN_INVITE_TTL_DAYS = 7;

@Injectable()
export class UsersService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly adminInviteRepository: AdminInviteRepository,
    private readonly auditLogService: AuditLogService,
    private readonly configService: ConfigService,
    @Inject(EMAIL_SENDER) private readonly emailSender: EmailSender,
  ) {}

  async getById(id: string): Promise<User> {
    return this.userRepository.findByIdOrFail(id, 'User');
  }

  async updateProfile(id: string, patch: Partial<Pick<User, 'fullName'>>): Promise<User> {
    const user = await this.userRepository.findByIdOrFail(id, 'User');
    Object.assign(user, patch);
    return this.userRepository.save(user);
  }

  /**
   * Public, narrow projection — just enough for another user's dashboard to
   * show a real name instead of a raw id (e.g. a provider's renter tag).
   * Never email/phone/roles.
   */
  async getPublicProfile(id: string): Promise<{ id: string; fullName: string }> {
    const user = await this.userRepository.findByIdOrFail(id, 'User');
    return { id: user.id, fullName: user.fullName };
  }

  /** [Super Admin] Finds an account by email — for locating who to promote. */
  async getByEmail(email: string): Promise<User> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw DomainException.notFound(ErrorCode.RESOURCE_NOT_FOUND, 'No account with that email.');
    }
    return user;
  }

  /**
   * [Super Admin] Replaces a user's full role set — the only path left for
   * granting admin/super_admin, now that signup can't (see SignupDto's
   * SELF_SERVICE_ROLES filter). Renter is always kept: it's the baseline
   * every account carries, the same invariant AuthService.signup() enforces.
   */
  async setRoles(id: string, roles: UserRole[], adminId: string): Promise<User> {
    const user = await this.userRepository.findByIdOrFail(id, 'User');
    const before = { roles: user.roles };
    user.roles = [...new Set([UserRole.RENTER, ...roles])];
    const saved = await this.userRepository.save(user);
    await this.auditLogService.record({
      actorId: adminId,
      actorType: AuditActorType.ADMIN,
      action: 'user.set_roles',
      entityType: 'User',
      entityId: id,
      before,
      after: { roles: saved.roles },
    });
    return saved;
  }

  /** [Admin] Customers view search — partial name/email match, paginated. */
  async searchForAdmin(query: string | undefined, cursor?: string, limit?: number): Promise<CursorPage<User>> {
    return this.userRepository.searchForAdmin(query, cursor, limit);
  }

  /**
   * [Admin] Suspends, bans, or reinstates an account. `User.status` already
   * gates login (AuthService.signup/login) — this is the first admin-facing
   * way to actually set it; nothing new to enforce it, since that already
   * exists. Reason is required for anything other than reinstating to
   * ACTIVE, matching the reason-required pattern already used for provider/
   * document rejection.
   */
  async setStatus(id: string, status: UserAccountStatus, adminId: string, reason?: string): Promise<User> {
    if (status !== UserAccountStatus.ACTIVE && (!reason || reason.trim().length < 5)) {
      throw DomainException.unprocessable(
        ErrorCode.VALIDATION_FAILED,
        'Please provide a reason of at least 5 characters.',
      );
    }
    const user = await this.userRepository.findByIdOrFail(id, 'User');
    const before = { status: user.status };
    user.status = status;
    const saved = await this.userRepository.save(user);
    await this.auditLogService.record({
      actorId: adminId,
      actorType: AuditActorType.ADMIN,
      action: 'user.set_status',
      entityType: 'User',
      entityId: id,
      before,
      after: { status: saved.status, reason: reason?.trim() },
    });
    return saved;
  }

  /** [Admin] Overview's "total users" stat. */
  async getStats(): Promise<{ totalUsers: number }> {
    const totalUsers = await this.userRepository.countAll();
    return { totalUsers };
  }

  /** [Super Admin] Admin Team view — everyone who currently has admin access, plus invites still awaiting a signup. */
  async listAdminTeam(): Promise<{ admins: User[]; invites: AdminInvite[] }> {
    const [admins, invites] = await Promise.all([
      this.userRepository.findAdmins(),
      this.adminInviteRepository.findPending(),
    ]);
    return { admins, invites };
  }

  /**
   * [Super Admin] Adds one role on top of whatever a user already has —
   * deliberately additive, unlike setRoles() which replaces the whole set.
   * setRoles() is right for the Customers drawer's "here's every box,
   * check what applies" editor; this is right for "grant admin access"
   * without silently stripping, say, an existing provider role.
   */
  async addRole(id: string, role: UserRole, adminId: string): Promise<User> {
    const user = await this.userRepository.findByIdOrFail(id, 'User');
    const before = { roles: user.roles };
    user.roles = [...new Set([...user.roles, role])];
    const saved = await this.userRepository.save(user);
    await this.auditLogService.record({
      actorId: adminId,
      actorType: AuditActorType.ADMIN,
      action: 'user.add_role',
      entityType: 'User',
      entityId: id,
      before,
      after: { roles: saved.roles },
    });
    return saved;
  }

  /**
   * [Super Admin] Grants admin/super_admin access by email. An existing
   * account gets the role immediately (no invite row needed — there's
   * nothing to wait for) and a notification email. An email with no
   * account yet gets a real invite: a token-bearing signup link that, once
   * used, grants the role as part of account creation (see
   * AuthService.signup()'s inviteToken handling) — this is the "invite
   * someone who doesn't have an account yet" half of the feature.
   */
  async inviteAdmin(
    email: string,
    role: UserRole,
    invitedByUserId: string,
  ): Promise<{ granted: boolean; user?: User }> {
    const frontendUrl = this.configService.get<AppConfig>('app')!.frontendUrl;
    const existing = await this.userRepository.findByEmail(email);

    if (existing) {
      const updated = await this.addRole(existing.id, role, invitedByUserId);
      await this.sendEmailBestEffort(
        email,
        'You now have admin access on Rently',
        `You've been granted ${role.replace('_', ' ')} access on Rently. Log in to get started:\n\n${frontendUrl}/auth`,
      );
      return { granted: true, user: updated };
    }

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const invite = this.adminInviteRepository.create({
      email,
      tokenHash,
      role,
      invitedByUserId,
      expiresAt: new Date(Date.now() + ADMIN_INVITE_TTL_DAYS * 24 * 60 * 60 * 1000),
    });
    await this.adminInviteRepository.save(invite);
    await this.auditLogService.record({
      actorId: invitedByUserId,
      actorType: AuditActorType.ADMIN,
      action: 'admin_invite.create',
      entityType: 'AdminInvite',
      entityId: invite.id,
      before: null,
      after: { email, role },
    });
    const signupLink = `${frontendUrl}/auth?inviteToken=${rawToken}&inviteEmail=${encodeURIComponent(email)}`;
    await this.sendEmailBestEffort(
      email,
      "You've been invited to join Rently's admin team",
      `You've been invited to join Rently as ${role === UserRole.SUPER_ADMIN ? 'a super admin' : 'an admin'}. This invite expires in ${ADMIN_INVITE_TTL_DAYS} days. Create your account to accept:\n\n${signupLink}`,
    );
    return { granted: false };
  }

  /** [Super Admin] Pulls an outstanding invite so it can no longer be redeemed — the row stays for the record, it's never deleted. */
  async revokeInvite(inviteId: string, adminId: string): Promise<AdminInvite> {
    const invite = await this.adminInviteRepository.findByIdOrFail(inviteId, 'Invite');
    invite.revokedAt = new Date();
    const saved = await this.adminInviteRepository.save(invite);
    await this.auditLogService.record({
      actorId: adminId,
      actorType: AuditActorType.ADMIN,
      action: 'admin_invite.revoke',
      entityType: 'AdminInvite',
      entityId: inviteId,
      before: { revokedAt: null },
      after: { revokedAt: saved.revokedAt },
    });
    return saved;
  }

  /** Mirrors AuthService.requestPasswordReset()'s delivery-failure handling — a Resend outage must never surface as a 500 to the admin who clicked "invite." The invite/role grant has already been persisted either way. */
  private async sendEmailBestEffort(to: string, subject: string, body: string): Promise<void> {
    try {
      await this.emailSender.send(to, subject, body);
    } catch (err) {
      // Swallowed deliberately — see doc comment above.
    }
  }
}
