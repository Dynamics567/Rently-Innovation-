import { PermissionsGuard } from './permissions.guard';
import { PermissionsService } from '@modules/identity/services/permissions.service';
import { UserRole } from '@modules/identity/enums/user-role.enum';

/**
 * Unit-level — same shape as the rest of this repo's *.spec.ts files. No
 * real NestJS ExecutionContext; a hand-rolled fake exposes exactly what
 * PermissionsGuard actually reads.
 */
describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflector: { getAllAndOverride: jest.Mock };
  let permissionsService: { userHasPermission: jest.Mock };

  function fakeContext(user: { id: string; roles: UserRole[] } | undefined) {
    return {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    } as any;
  }

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    permissionsService = { userHasPermission: jest.fn() };
    guard = new PermissionsGuard(reflector as any, permissionsService as unknown as PermissionsService);
  });

  it('is a no-op pass-through for a route with no @RequirePermission()', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    await expect(guard.canActivate(fakeContext({ id: 'user-1', roles: [UserRole.ADMIN] }))).resolves.toBe(true);
    expect(permissionsService.userHasPermission).not.toHaveBeenCalled();
  });

  it('always allows SUPER_ADMIN without looking up permissions', async () => {
    reflector.getAllAndOverride.mockReturnValue('disputes.resolve');

    await expect(
      guard.canActivate(fakeContext({ id: 'user-1', roles: [UserRole.ADMIN, UserRole.SUPER_ADMIN] })),
    ).resolves.toBe(true);
    expect(permissionsService.userHasPermission).not.toHaveBeenCalled();
  });

  it('allows a plain admin whose assigned role grants the required permission', async () => {
    reflector.getAllAndOverride.mockReturnValue('disputes.resolve');
    permissionsService.userHasPermission.mockResolvedValue(true);

    await expect(guard.canActivate(fakeContext({ id: 'user-1', roles: [UserRole.ADMIN] }))).resolves.toBe(true);
    expect(permissionsService.userHasPermission).toHaveBeenCalledWith('user-1', 'disputes.resolve');
  });

  it('rejects a plain admin whose assigned role does not grant the required permission', async () => {
    reflector.getAllAndOverride.mockReturnValue('disputes.resolve');
    permissionsService.userHasPermission.mockResolvedValue(false);

    await expect(guard.canActivate(fakeContext({ id: 'user-1', roles: [UserRole.ADMIN] }))).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });
});
