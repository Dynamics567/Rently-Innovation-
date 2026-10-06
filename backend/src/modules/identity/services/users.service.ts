import { Injectable } from '@nestjs/common';
import { DomainException } from '@common/errors/domain.exception';
import { ErrorCode } from '@common/errors/error-codes.enum';
import { CursorPage } from '@common/dto/cursor-pagination.dto';
import { AuditLogService } from '@common/audit/audit-log.service';
import { AuditActorType } from '@common/audit/audit-actor-type.enum';
import { UserRepository } from '../repositories/user.repository';
import { User } from '../entities/user.entity';
import { UserRole } from '../enums/user-role.enum';
import { UserAccountStatus } from '../enums/verification-status.enum';

@Injectable()
export class UsersService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly auditLogService: AuditLogService,
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
}
