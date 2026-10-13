import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@common/base/base.entity';

/**
 * Plain join row (User holds AdminRole) — a bare `userId` column rather
 * than a relation on the User entity itself, to avoid touching the most
 * central entity in the system for what is otherwise a two-column table.
 * See CreateAdminRbac migration.
 */
@Entity('user_admin_roles')
@Index(['userId', 'adminRoleId'], { unique: true })
export class UserAdminRole extends BaseEntity {
  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'admin_role_id' })
  adminRoleId: string;
}
