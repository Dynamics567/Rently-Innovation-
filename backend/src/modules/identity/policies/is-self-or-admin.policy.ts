import { ExecutionContext, Injectable } from '@nestjs/common';
import { PolicyHandler } from '@common/policies/policy-handler.interface';
import { UserRole } from '../enums/user-role.enum';

/**
 * Example of the Policies layer in action: RolesGuard already confirmed the
 * caller holds *some* valid role — this handler additionally confirms
 * they're acting on *their own* resource (`:userId` route param) unless
 * they're staff. Used on routes like `PATCH /users/:userId`.
 */
@Injectable()
export class IsSelfOrAdminPolicy implements PolicyHandler {
  handle(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const { user } = request;
    const targetUserId = request.params.userId ?? request.params.id;

    if (!user) return false;
    if (user.roles.includes(UserRole.ADMIN) || user.roles.includes(UserRole.SUPER_ADMIN)) {
      return true;
    }
    return user.id === targetUserId;
  }
}
