import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { Exclude } from 'class-transformer';
import { BaseEntity } from '@common/base/base.entity';
import { User } from './user.entity';

/**
 * Refresh tokens are stored hashed (never the raw token — same principle as
 * a password) and rotated on every use: redeeming one issues a new token and
 * revokes the old one. If a revoked token is ever presented again, that's a
 * signal of token theft — the service layer treats it as "revoke the entire
 * family," not just the one token.
 */
@Entity('refresh_tokens')
export class RefreshToken extends BaseEntity {
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  @Exclude()
  @Index({ unique: true })
  @Column({ name: 'token_hash', type: 'text' })
  tokenHash: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt?: Date | null;

  @Column({ name: 'replaced_by_token_id', type: 'uuid', nullable: true })
  replacedByTokenId?: string | null;

  isActive(): boolean {
    return !this.revokedAt && this.expiresAt > new Date();
  }
}
