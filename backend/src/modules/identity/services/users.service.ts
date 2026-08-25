import { Injectable } from '@nestjs/common';
import { DomainException } from '@common/errors/domain.exception';
import { ErrorCode } from '@common/errors/error-codes.enum';
import { AuditLogService } from '@common/audit/audit-log.service';
import { AuditActorType } from '@common/audit/audit-actor-type.enum';
import { UserRepository } from '../repositories/user.repository';
import { User } from '../entities/user.entity';
import { UserRole } from '../enums/user-role.enum';

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
}
