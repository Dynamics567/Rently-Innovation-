import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash, randomBytes } from 'crypto';
import { DomainException } from '@common/errors/domain.exception';
import { ErrorCode } from '@common/errors/error-codes.enum';
import { AuthConfig } from '@config/configuration';
import { User } from '../entities/user.entity';
import { RefreshToken } from '../entities/refresh-token.entity';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * Owns everything about token issuance/rotation so AuthService reads as
 * business flow ("sign up", "log in") rather than JWT plumbing. Refresh
 * tokens are opaque random strings, stored only as a SHA-256 hash — if the
 * `refresh_tokens` table ever leaked, no usable token is recoverable from it,
 * the same principle as a password hash.
 */
@Injectable()
export class TokenService {
  private readonly authConfig: AuthConfig;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(RefreshToken) private readonly refreshTokenRepo: Repository<RefreshToken>,
  ) {
    this.authConfig = this.configService.get<AuthConfig>('auth')!; // guaranteed by validation.schema.ts
  }

  async issueTokenPair(user: User): Promise<TokenPair> {
    const accessToken = this.jwtService.sign(
      { sub: user.id, roles: user.roles },
      { secret: this.authConfig.accessSecret, expiresIn: this.authConfig.accessExpiresIn },
    );

    const rawRefreshToken = randomBytes(48).toString('hex');
    const tokenHash = this.hash(rawRefreshToken);
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + this.parseExpiry(this.authConfig.refreshExpiresIn));

    await this.refreshTokenRepo.save(
      this.refreshTokenRepo.create({ userId: user.id, tokenHash, expiresAt }),
    );

    return { accessToken, refreshToken: rawRefreshToken };
  }

  /**
   * Rotation: the *raw refresh token itself* is the only credential this
   * needs — deliberately not gated behind a valid access token, since the
   * whole point of refreshing is that the access token has already expired.
   * The presented token is looked up by hash, validated, and revoked in the
   * same call that issues its replacement. A second redemption attempt of an
   * already-revoked token is treated as a compromise signal — every
   * outstanding token for that user is revoked, forcing a fresh login.
   */
  async rotateRefreshToken(rawRefreshToken: string, user: User): Promise<TokenPair> {
    const tokenHash = this.hash(rawRefreshToken);
    const existing = await this.refreshTokenRepo.findOne({ where: { tokenHash } });

    if (!existing || existing.userId !== user.id) {
      throw DomainException.unauthorized(ErrorCode.REFRESH_TOKEN_INVALID, 'Invalid refresh token.');
    }

    if (!existing.isActive()) {
      await this.revokeAllForUser(user.id);
      throw DomainException.unauthorized(
        ErrorCode.REFRESH_TOKEN_INVALID,
        'This session was invalidated. Please log in again.',
      );
    }

    const newPair = await this.issueTokenPair(user);
    existing.revokedAt = new Date();
    await this.refreshTokenRepo.save(existing);

    return newPair;
  }

  /** Resolves which user a raw refresh token belongs to, without requiring a valid access token first. */
  async findUserIdByRefreshToken(rawRefreshToken: string): Promise<string> {
    const tokenHash = this.hash(rawRefreshToken);
    const existing = await this.refreshTokenRepo.findOne({ where: { tokenHash } });
    if (!existing) {
      throw DomainException.unauthorized(ErrorCode.REFRESH_TOKEN_INVALID, 'Invalid refresh token.');
    }
    return existing.userId;
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.refreshTokenRepo.update({ userId, revokedAt: undefined }, { revokedAt: new Date() });
  }

  private hash(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  private parseExpiry(value: string): number {
    const match = /^(\d+)([smhd])$/.exec(value);
    if (!match) return 30 * 24 * 60 * 60;
    const [, amount, unit] = match;
    const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
    return parseInt(amount, 10) * multipliers[unit];
  }
}
