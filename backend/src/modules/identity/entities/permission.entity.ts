import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@common/base/base.entity';

/**
 * One row per distinct admin capability, dotted `module.action` (e.g.
 * `disputes.resolve`) matching AuditLogService's own action-string
 * convention. Fixed, small, seeded set (see the CreateAdminRbac migration)
 * — new permissions are added by migration as new admin capabilities ship,
 * not created ad hoc at runtime.
 */
@Entity('permissions')
export class Permission extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: 'text' })
  key: string;

  @Column({ type: 'text' })
  label: string;

  @Column({ type: 'text' })
  module: string;
}
