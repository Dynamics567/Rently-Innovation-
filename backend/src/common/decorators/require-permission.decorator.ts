import { SetMetadata } from '@nestjs/common';

export const PERMISSION_KEY = 'permission';

/**
 * Granular, additive layer on top of `@Roles()` — `@RequirePermission('disputes.resolve')`.
 * Enforcement lives in PermissionsGuard, which runs after RolesGuard and is
 * a no-op for any route without this decorator, so every existing
 * `@Roles(ADMIN, SUPER_ADMIN)` route keeps working exactly as before unless
 * explicitly opted into the finer-grained check.
 */
export const RequirePermission = (key: string) => SetMetadata(PERMISSION_KEY, key);
