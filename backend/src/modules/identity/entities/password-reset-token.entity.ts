import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { Exclude } from 'class-transformer';
import { BaseEntity } from '@common/base/base.entity';
import { User } from './user.entity';

/**
 * Stored hashed, same principle as RefreshToken — if this table ever
 * leaked, no usable reset link is recoverable from it. Single-use: consumed
 * (marked via `usedAt`) the moment a reset succeeds, so a leaked-but-unused
 * link can't be replayed after the fact.
 */
@Entity('password_reset_tokens')
export class PasswordResetToken extends BaseEntity {
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

  @Column({ name: 'used_at', type: 'timestamptz', nullable: true })
  usedAt?: Date | null;

  isActive(): boolean {
    return !this.usedAt && this.expiresAt > new Date();
  }
}
