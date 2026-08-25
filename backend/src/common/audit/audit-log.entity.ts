import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@common/base/base.entity';
import { AuditActorType } from './audit-actor-type.enum';

/**
 * Append-only record of who did what to which entity — an application-level
 * write from each admin action, not a Postgres trigger (docs/DATABASE_SCHEMA.md
 * describes a trigger-based version; that's heavier operational complexity
 * than this stage needs, same Phase 1 MVP-scoping judgment call already made
 * for MockPaymentAdapter). `action` is a free-form dotted string
 * ('provider_profile.approve_verification') rather than an enum, so a new
 * admin action never needs a migration to be auditable.
 */
@Entity('audit_log')
@Index(['entityType', 'entityId'])
@Index(['actorId'])
export class AuditLog extends BaseEntity {
  @Column({ name: 'actor_id', type: 'uuid', nullable: true })
  actorId?: string | null;

  @Column({ name: 'actor_type', type: 'enum', enum: AuditActorType, default: AuditActorType.ADMIN })
  actorType: AuditActorType;

  @Column({ type: 'text' })
  action: string;

  @Column({ name: 'entity_type', type: 'text' })
  entityType: string;

  @Column({ name: 'entity_id', type: 'uuid' })
  entityId: string;

  @Column({ type: 'jsonb', nullable: true })
  before?: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true })
  after?: Record<string, unknown> | null;
}
