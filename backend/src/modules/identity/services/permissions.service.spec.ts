import { PermissionsService } from './permissions.service';
import { PermissionRepository } from '../repositories/permission.repository';
import { AdminRoleRepository } from '../repositories/admin-role.repository';
import { AdminRolePermissionRepository } from '../repositories/admin-role-permission.repository';
import { UserAdminRoleRepository } from '../repositories/user-admin-role.repository';
import { AuditLogService } from '@common/audit/audit-log.service';

/**
 * Unit-level, same shape as the other *.service.spec.ts files in this repo.
 * Everything here operates on a small, fixed-cardinality dataset by design
 * (see the service's own doc comment) — these tests mirror that with a
 * handful of hand-rolled rows rather than a real join query.
 */
describe('PermissionsService', () => {
  let service: PermissionsService;
  let permissionRepository: Record<'findByKey' | 'findAll', jest.Mock>;
  let adminRoleRepository: Record<'findAll' | 'findByIdOrFail', jest.Mock>;
  let rolePermissionRepository: Record<'findByRoleIds' | 'findAll', jest.Mock>;
  let userAdminRoleRepository: Record<'findByUser' | 'findOneForUserAndRole' | 'create' | 'save' | 'softDelete', jest.Mock>;
  let auditLogService: Record<'record', jest.Mock>;
  let dataSource: { transaction: jest.Mock };

  beforeEach(() => {
    permissionRepository = {
      findByKey: jest.fn(),
      findAll: jest.fn(async () => [
        { id: 'perm-view', key: 'disputes.view', label: 'View disputes', module: 'Operations' },
        { id: 'perm-resolve', key: 'disputes.resolve', label: 'Resolve disputes', module: 'Operations' },
      ]),
    };
    adminRoleRepository = {
      findAll: jest.fn(async () => [{ id: 'role-ops', name: 'Operations Admin', slug: 'operations-admin' }]),
      findByIdOrFail: jest.fn(async () => ({ id: 'role-ops', name: 'Operations Admin', slug: 'operations-admin' })),
    };
    rolePermissionRepository = {
      findByRoleIds: jest.fn(async () => []),
      findAll: jest.fn(async () => []),
    };
    userAdminRoleRepository = {
      findByUser: jest.fn(async () => []),
      findOneForUserAndRole: jest.fn(async () => null),
      create: jest.fn((partial: unknown) => partial),
      save: jest.fn(async (row: unknown) => row),
      softDelete: jest.fn(async () => undefined),
    };
    auditLogService = { record: jest.fn(async () => undefined) };
    dataSource = { transaction: jest.fn((cb: (m: unknown) => unknown) => cb({ delete: jest.fn(), insert: jest.fn() })) };

    service = new PermissionsService(
      dataSource as any,
      permissionRepository as unknown as PermissionRepository,
      adminRoleRepository as unknown as AdminRoleRepository,
      rolePermissionRepository as unknown as AdminRolePermissionRepository,
      userAdminRoleRepository as unknown as UserAdminRoleRepository,
      auditLogService as unknown as AuditLogService,
    );
  });

  describe('userHasPermission', () => {
    it('denies when the permission key is unknown rather than throwing', async () => {
      permissionRepository.findByKey.mockResolvedValue(null);

      await expect(service.userHasPermission('user-1', 'nonexistent.key')).resolves.toBe(false);
    });

    it('denies a user with no admin roles assigned', async () => {
      permissionRepository.findByKey.mockResolvedValue({ id: 'perm-resolve', key: 'disputes.resolve' });
      userAdminRoleRepository.findByUser.mockResolvedValue([]);

      await expect(service.userHasPermission('user-1', 'disputes.resolve')).resolves.toBe(false);
    });

    it('allows when one of the user\'s assigned roles grants the permission', async () => {
      permissionRepository.findByKey.mockResolvedValue({ id: 'perm-resolve', key: 'disputes.resolve' });
      userAdminRoleRepository.findByUser.mockResolvedValue([{ adminRoleId: 'role-ops' }]);
      rolePermissionRepository.findByRoleIds.mockResolvedValue([{ adminRoleId: 'role-ops', permissionId: 'perm-resolve' }]);

      await expect(service.userHasPermission('user-1', 'disputes.resolve')).resolves.toBe(true);
    });

    it('denies when the assigned role exists but does not grant this specific permission', async () => {
      permissionRepository.findByKey.mockResolvedValue({ id: 'perm-resolve', key: 'disputes.resolve' });
      userAdminRoleRepository.findByUser.mockResolvedValue([{ adminRoleId: 'role-support' }]);
      rolePermissionRepository.findByRoleIds.mockResolvedValue([{ adminRoleId: 'role-support', permissionId: 'perm-other' }]);

      await expect(service.userHasPermission('user-1', 'disputes.resolve')).resolves.toBe(false);
    });
  });

  describe('setRolePermissions', () => {
    it('audit-logs the before/after permission keys for the role', async () => {
      rolePermissionRepository.findByRoleIds.mockResolvedValue([{ adminRoleId: 'role-ops', permissionId: 'perm-view' }]);

      await service.setRolePermissions('role-ops', ['disputes.resolve'], 'admin-1');

      expect(dataSource.transaction).toHaveBeenCalled();
      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'admin_role.set_permissions',
          entityType: 'AdminRole',
          entityId: 'role-ops',
          before: { permissionKeys: ['disputes.view'] },
          after: { permissionKeys: ['disputes.resolve'], roleName: 'Operations Admin' },
        }),
      );
    });
  });

  describe('assignRoleToUser / revokeRoleFromUser', () => {
    it('is idempotent — assigning an already-assigned role does not duplicate or re-audit-log', async () => {
      userAdminRoleRepository.findOneForUserAndRole.mockResolvedValue({ id: 'existing-row' });

      await service.assignRoleToUser('user-1', 'role-ops', 'admin-1');

      expect(userAdminRoleRepository.save).not.toHaveBeenCalled();
      expect(auditLogService.record).not.toHaveBeenCalled();
    });

    it('assigns a new role and audit-logs it', async () => {
      userAdminRoleRepository.findOneForUserAndRole.mockResolvedValue(null);

      await service.assignRoleToUser('user-1', 'role-ops', 'admin-1');

      expect(userAdminRoleRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-1', adminRoleId: 'role-ops' }),
      );
      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'user.assign_admin_role', entityId: 'user-1' }),
      );
    });

    it('revoking an unassigned role is a no-op, not an error', async () => {
      userAdminRoleRepository.findOneForUserAndRole.mockResolvedValue(null);

      await service.revokeRoleFromUser('user-1', 'role-ops', 'admin-1');

      expect(userAdminRoleRepository.softDelete).not.toHaveBeenCalled();
    });

    it('revokes an assigned role and audit-logs it', async () => {
      userAdminRoleRepository.findOneForUserAndRole.mockResolvedValue({ id: 'row-1' });

      await service.revokeRoleFromUser('user-1', 'role-ops', 'admin-1');

      expect(userAdminRoleRepository.softDelete).toHaveBeenCalledWith('row-1');
      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'user.revoke_admin_role', entityId: 'user-1' }),
      );
    });
  });
});
