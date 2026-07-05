import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { DomainException } from '../errors/domain.exception';
import { ErrorCode } from '../errors/error-codes.enum';
import { UserRole } from '@modules/identity/enums/user-role.enum';

/**
 * Coarse-grained RBAC: "does this user's role appear in the route's
 * @Roles(...) list." Runs after JwtAuthGuard (so `request.user` is already
 * populated) and before any @CheckPolicies() attribute-based check — role
 * membership is the cheap, first-pass filter; ownership/attribute checks
 * (PoliciesGuard) are the more expensive second pass, only reached if this
 * one passes.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    const hasRole = user?.roles?.some((role: UserRole) => requiredRoles.includes(role));
    if (!hasRole) {
      throw DomainException.forbidden(
        ErrorCode.FORBIDDEN,
        'You do not have permission to perform this action.',
      );
    }
    return true;
  }
}
