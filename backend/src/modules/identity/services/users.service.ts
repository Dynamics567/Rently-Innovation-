import { Injectable } from '@nestjs/common';
import { DomainException } from '@common/errors/domain.exception';
import { ErrorCode } from '@common/errors/error-codes.enum';
import { UserRepository } from '../repositories/user.repository';
import { User } from '../entities/user.entity';
import { UserRole } from '../enums/user-role.enum';

@Injectable()
export class UsersService {
  constructor(private readonly userRepository: UserRepository) {}

  async getById(id: string): Promise<User> {
    return this.userRepository.findByIdOrFail(id, 'User');
  }

  async updateProfile(id: string, patch: Partial<Pick<User, 'fullName'>>): Promise<User> {
    const user = await this.userRepository.findByIdOrFail(id, 'User');
    Object.assign(user, patch);
    return this.userRepository.save(user);
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
  async setRoles(id: string, roles: UserRole[]): Promise<User> {
    const user = await this.userRepository.findByIdOrFail(id, 'User');
    user.roles = [...new Set([UserRole.RENTER, ...roles])];
    return this.userRepository.save(user);
  }
}
