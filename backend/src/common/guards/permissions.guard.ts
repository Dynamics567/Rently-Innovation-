import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSION_KEY } from '../decorators/require-permission.decorator';
import { DomainException } from '../errors/domain.exception';
import { ErrorCode } from '../errors/error-codes.enum';
import { UserRole } from '@modules/identity/enums/user-role.enum';
import { PermissionsService } from '@modules/identity/services/permissions.service';

/**
 * The granular layer on top of RolesGuard's coarse ADMIN/SUPER_ADMIN gate —
 * additive, not a replacement: a no-op for any route without
 * @RequirePermission(), so nothing that worked before this guard existed
 * changes behavior unless a route explicitly opts in. SUPER_ADMIN always
 * bypasses (hardcoded, never looked up in the permission tables) — a super
 * admin's privileges already extend beyond these permissions (team
 * management, for one), so it was never going to be "just another role."
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissionsService: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.getAllAndOverride<string | undefined>(PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredPermission) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (user?.roles?.includes(UserRole.SUPER_ADMIN)) {
      return true;
    }

    const allowed = await this.permissionsService.userHasPermission(user?.id, requiredPermission);
    if (!allowed) {
      throw DomainException.forbidden(
        ErrorCode.FORBIDDEN,
        'You do not have permission to perform this action.',
      );
    }
    return true;
  }
}
