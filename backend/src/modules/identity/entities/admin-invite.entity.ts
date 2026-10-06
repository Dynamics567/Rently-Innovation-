import { Column, Entity, Index } from 'typeorm';
import { Exclude } from 'class-transformer';
import { BaseEntity } from '@common/base/base.entity';
import { UserRole } from '../enums/user-role.enum';

/**
 * Stored hashed, same principle as PasswordResetToken — a leaked table
 * gives up no usable invite link. Keyed by email, not userId (unlike
 * PasswordResetToken): the whole point is granting access to someone who
 * may not have an account yet. `role` is always `admin` or `super_admin`
 * in practice (the only two UserRole values AdminTeamController's DTO
 * accepts), typed as the full UserRole enum since TypeORM's `enum` option
 * just needs a superset, not an exact match with the DB enum's members.
 */
@Entity('admin_invites')
export class AdminInvite extends BaseEntity {
  @Column({ type: 'citext' })
  email: string;

  @Exclude()
  @Index({ unique: true })
  @Column({ name: 'token_hash', type: 'text' })
  tokenHash: string;

  @Column({ type: 'enum', enum: UserRole })
  role: UserRole;

  @Column({ name: 'invited_by_user_id' })
  invitedByUserId: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @Column({ name: 'accepted_at', type: 'timestamptz', nullable: true })
  acceptedAt?: Date | null;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt?: Date | null;

  isActive(): boolean {
    return !this.acceptedAt && !this.revokedAt && this.expiresAt > new Date();
  }
}
