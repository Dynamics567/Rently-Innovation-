import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@common/base/base.entity';

/**
 * A named, assignable bundle of permissions (Operations Admin, Finance
 * Admin, ...) — distinct from UserRole.ADMIN/SUPER_ADMIN, which stays the
 * coarse "can this user reach the admin surface at all" gate. A user can
 * hold more than one AdminRole at once (see UserAdminRole).
 */
@Entity('admin_roles')
export class AdminRole extends BaseEntity {
  @Column({ type: 'text' })
  name: string;

  @Index({ unique: true })
  @Column({ type: 'text' })
  slug: string;
}
