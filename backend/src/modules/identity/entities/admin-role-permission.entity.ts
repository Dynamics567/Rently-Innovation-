import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@common/base/base.entity';

/**
 * Plain join row (AdminRole grants Permission) — bare FK id columns, not a
 * TypeORM @ManyToMany, to avoid adding relations onto either side for what
 * is otherwise a two-column table. See CreateAdminRbac migration.
 */
@Entity('admin_role_permissions')
@Index(['adminRoleId', 'permissionId'], { unique: true })
export class AdminRolePermission extends BaseEntity {
  @Column({ name: 'admin_role_id' })
  adminRoleId: string;

  @Column({ name: 'permission_id' })
  permissionId: string;
}
