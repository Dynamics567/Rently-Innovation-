import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@modules/identity/enums/user-role.enum';

export const ROLES_KEY = 'roles';

/**
 * Declarative RBAC at the route: `@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)`.
 * Enforcement lives in RolesGuard, never in the controller body — a
 * forgotten `if (user.role !== 'admin')` check is exactly the kind of bug
 * this pattern exists to make structurally impossible.
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
