import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AuditLogService } from '@common/audit/audit-log.service';
import { AuditActorType } from '@common/audit/audit-actor-type.enum';
import { PermissionRepository } from '../repositories/permission.repository';
import { AdminRoleRepository } from '../repositories/admin-role.repository';
import { AdminRolePermissionRepository } from '../repositories/admin-role-permission.repository';
import { UserAdminRoleRepository } from '../repositories/user-admin-role.repository';
import { Permission } from '../entities/permission.entity';
import { AdminRole } from '../entities/admin-role.entity';
import { AdminRolePermission } from '../entities/admin-role-permission.entity';

/**
 * The granular layer on top of UserRole.ADMIN/SUPER_ADMIN (RolesGuard) —
 * see PermissionsGuard for how the two combine. Everything here operates on
 * a small, fixed-cardinality dataset (13 permissions, ~8 roles), so this
 * favors a few simple, readable queries over one clever join.
 */
@Injectable()
export class PermissionsService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly permissionRepository: PermissionRepository,
    private readonly adminRoleRepository: AdminRoleRepository,
    private readonly rolePermissionRepository: AdminRolePermissionRepository,
    private readonly userAdminRoleRepository: UserAdminRoleRepository,
    private readonly auditLogService: AuditLogService,
  ) {}

  /** Called by PermissionsGuard for every @RequirePermission()-decorated route, for non-super-admin users. */
  async userHasPermission(userId: string, key: string): Promise<boolean> {
    const permission = await this.permissionRepository.findByKey(key);
    if (!permission) return false; // unknown key — deny, never throw; a typo in a decorator should fail closed.

    const assignments = await this.userAdminRoleRepository.findByUser(userId);
    if (!assignments.length) return false;

    const roleIds = assignments.map((a) => a.adminRoleId);
    const grants = await this.rolePermissionRepository.findByRoleIds(roleIds);
    return grants.some((g) => g.permissionId === permission.id);
  }

  async listPermissions(): Promise<Permission[]> {
    return this.permissionRepository.findAll();
  }

  /** [Admin] Permissions matrix — every role with the set of permission keys it currently grants. */
  async listRolesWithPermissions(): Promise<Array<AdminRole & { permissionKeys: string[] }>> {
    const [roles, permissions, grants] = await Promise.all([
      this.adminRoleRepository.findAll(),
      this.permissionRepository.findAll(),
      this.rolePermissionRepository.findAll(),
    ]);
    const permissionKeyById = new Map(permissions.map((p) => [p.id, p.key]));
    return roles.map((role) => {
      const keys = grants
        .filter((g) => g.adminRoleId === role.id)
        .map((g) => permissionKeyById.get(g.permissionId))
        .filter((k): k is string => !!k);
      return Object.assign(role, { permissionKeys: keys });
    });
  }

  /** [Super Admin] Replaces a role's entire permission grant in one go — matches how setRoles() on a user is a full replace, not an incremental add/remove. */
  async setRolePermissions(roleId: string, permissionKeys: string[], adminId: string): Promise<void> {
    const role = await this.adminRoleRepository.findByIdOrFail(roleId, 'Admin role');
    const permissions = await this.permissionRepository.findAll();
    const before = (await this.rolePermissionRepository.findByRoleIds([roleId])).map(
      (g) => permissions.find((p) => p.id === g.permissionId)?.key,
    );
    const permissionIds = permissions.filter((p) => permissionKeys.includes(p.key)).map((p) => p.id);

    await this.dataSource.transaction(async (manager) => {
      await manager.delete(AdminRolePermission, { adminRoleId: roleId });
      if (permissionIds.length) {
        await manager.insert(
          AdminRolePermission,
          permissionIds.map((permissionId) => ({ adminRoleId: roleId, permissionId })),
        );
      }
    });

    await this.auditLogService.record({
      actorId: adminId,
      actorType: AuditActorType.ADMIN,
      action: 'admin_role.set_permissions',
      entityType: 'AdminRole',
      entityId: roleId,
      before: { permissionKeys: before },
      after: { permissionKeys, roleName: role.name },
    });
  }

  async assignRoleToUser(userId: string, roleId: string, adminId: string): Promise<void> {
    const role = await this.adminRoleRepository.findByIdOrFail(roleId, 'Admin role');
    const existing = await this.userAdminRoleRepository.findOneForUserAndRole(userId, roleId);
    if (existing) return; // already assigned — idempotent

    const row = this.userAdminRoleRepository.create({ userId, adminRoleId: roleId });
    await this.userAdminRoleRepository.save(row);
    await this.auditLogService.record({
      actorId: adminId,
      actorType: AuditActorType.ADMIN,
      action: 'user.assign_admin_role',
      entityType: 'User',
      entityId: userId,
      before: null,
      after: { adminRole: role.name },
    });
  }

  async revokeRoleFromUser(userId: string, roleId: string, adminId: string): Promise<void> {
    const role = await this.adminRoleRepository.findByIdOrFail(roleId, 'Admin role');
    const existing = await this.userAdminRoleRepository.findOneForUserAndRole(userId, roleId);
    if (!existing) return; // already absent — idempotent

    await this.userAdminRoleRepository.softDelete(existing.id);
    await this.auditLogService.record({
      actorId: adminId,
      actorType: AuditActorType.ADMIN,
      action: 'user.revoke_admin_role',
      entityType: 'User',
      entityId: userId,
      before: { adminRole: role.name },
      after: null,
    });
  }

  async listRolesForUser(userId: string): Promise<AdminRole[]> {
    const assignments = await this.userAdminRoleRepository.findByUser(userId);
    if (!assignments.length) return [];
    const roles = await this.adminRoleRepository.findAll();
    const roleIds = new Set(assignments.map((a) => a.adminRoleId));
    return roles.filter((r) => roleIds.has(r.id));
  }
}
