import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { randomBytes, createHash } from 'crypto';
import { DomainException } from '@common/errors/domain.exception';
import { ErrorCode } from '@common/errors/error-codes.enum';
import { AppConfig } from '@config/configuration';
import { UserRepository } from '../repositories/user.repository';
import { PasswordResetTokenRepository } from '../repositories/password-reset-token.repository';
import { TokenService, TokenPair } from './token.service';
import { OtpService } from './otp.service';
import { EMAIL_SENDER, EmailSender } from './email-sender.port';
import { SignupDto, SELF_SERVICE_ROLES } from '../dto/signup.dto';
import { LoginDto } from '../dto/login.dto';
import { User } from '../entities/user.entity';
import { UserRole } from '../enums/user-role.enum';
import { UserAccountStatus } from '../enums/verification-status.enum';

const BCRYPT_ROUNDS = 12;
const PASSWORD_RESET_TTL_MINUTES = 30;

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordResetTokenRepository: PasswordResetTokenRepository,
    private readonly tokenService: TokenService,
    private readonly otpService: OtpService,
    private readonly configService: ConfigService,
    @Inject(EMAIL_SENDER) private readonly emailSender: EmailSender,
  ) {}

  async signup(dto: SignupDto): Promise<{ user: User; tokens: TokenPair }> {
    const existing = await this.userRepository.findByEmailOrPhone({
      email: dto.email,
      phone: dto.phone,
    });
    if (existing) {
      throw DomainException.conflict(
        ErrorCode.EMAIL_ALREADY_REGISTERED,
        'An account with this email or phone already exists.',
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    // Every account is a Renter at minimum — signing up as a Provider adds
    // that role on top, it never replaces the baseline one. Every account
    // can browse and book, whether or not it can also list.
    //
    // Re-filtered against SELF_SERVICE_ROLES here, not just at the DTO
    // layer (SignupDto's @IsIn) — this is the actual privilege boundary.
    // Never trust a single validation layer for "can this request make an
    // admin account," the same way login() never trusts the client to say
    // which error occurred.
    const requestedRoles = (dto.roles ?? []).filter((r) => (SELF_SERVICE_ROLES as readonly UserRole[]).includes(r));
    const roles = new Set([UserRole.RENTER, ...requestedRoles]);
    const user = this.userRepository.create({
      email: dto.email,
      phone: dto.phone,
      passwordHash,
      fullName: dto.fullName,
      roles: [...roles],
    });
    await this.userRepository.save(user);

    if (dto.phone) {
      await this.otpService.requestOtp(dto.phone);
    }

    const tokens = await this.tokenService.issueTokenPair(user);
    return { user, tokens };
  }

  async login(dto: LoginDto): Promise<{ user: User; tokens: TokenPair }> {
    const user = await this.userRepository.findByEmailOrPhone({
      email: dto.email,
      phone: dto.phone,
    });
    // Constant-shape response whether the account exists or the password is
    // wrong — never reveal which one failed, that's a user-enumeration leak.
    const passwordMatches = user?.passwordHash
      ? await bcrypt.compare(dto.password, user.passwordHash)
      : await bcrypt.compare(dto.password, '$2b$12$invalidsaltinvalidsaltinvalidsal.');

    if (!user || !passwordMatches) {
      throw DomainException.unauthorized(
        ErrorCode.INVALID_CREDENTIALS,
        'Incorrect email/phone or password.',
      );
    }

    if (user.status !== UserAccountStatus.ACTIVE) {
      throw DomainException.forbidden(ErrorCode.ACCOUNT_SUSPENDED, 'This account is suspended.');
    }

    const tokens = await this.tokenService.issueTokenPair(user);
    return { user, tokens };
  }

  /**
   * Deliberately takes only the raw refresh token — no access token
   * required, since the caller's access token has typically just expired.
   * The refresh token itself, resolved to a user via TokenService, is the
   * credential.
   */
  async refresh(rawRefreshToken: string): Promise<TokenPair> {
    const userId = await this.tokenService.findUserIdByRefreshToken(rawRefreshToken);
    const user = await this.userRepository.findByIdOrFail(userId, 'User');
    return this.tokenService.rotateRefreshToken(rawRefreshToken, user);
  }

  async logout(userId: string): Promise<void> {
    await this.tokenService.revokeAllForUser(userId);
  }

  async verifyPhoneOtp(userId: string, phone: string, code: string): Promise<void> {
    this.otpService.verifyOtp(phone, code);
    const user = await this.userRepository.findByIdOrFail(userId, 'User');
    user.phoneVerifiedAt = new Date();
    await this.userRepository.save(user);
  }

  /**
   * Always resolves silently, whether or not the email is registered —
   * same constant-response principle as login(), so this endpoint can't be
   * used to enumerate which emails have accounts. The reset link is only
   * actually emailed when a matching user exists.
   */
  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) return;

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MINUTES * 60 * 1000);
    await this.passwordResetTokenRepository.save(
      this.passwordResetTokenRepository.create({ userId: user.id, tokenHash, expiresAt }),
    );

    const frontendUrl = this.configService.get<AppConfig>('app')!.frontendUrl;
    const resetLink = `${frontendUrl}/auth?resetToken=${rawToken}`;
    await this.emailSender.send(
      email,
      'Reset your Rently password',
      `We received a request to reset your password. This link expires in ${PASSWORD_RESET_TTL_MINUTES} minutes:\n\n${resetLink}\n\nIf you didn't request this, you can ignore this email.`,
    );
  }

  /**
   * Single-use — the token is marked spent the moment it succeeds, and
   * every outstanding refresh token for the account is revoked, forcing a
   * fresh login everywhere. That's deliberate: a password reset is exactly
   * the moment to assume prior sessions might not be trustworthy.
   */
  async resetPassword(rawToken: string, newPassword: string): Promise<void> {
    const tokenHash = this.hashToken(rawToken);
    const resetToken = await this.passwordResetTokenRepository.findByTokenHash(tokenHash);
    if (!resetToken || !resetToken.isActive()) {
      throw DomainException.unprocessable(
        ErrorCode.PASSWORD_RESET_TOKEN_INVALID,
        'This password reset link is invalid or has expired.',
      );
    }

    const user = await this.userRepository.findByIdOrFail(resetToken.userId, 'User');
    user.passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await this.userRepository.save(user);

    resetToken.usedAt = new Date();
    await this.passwordResetTokenRepository.save(resetToken);

    await this.tokenService.revokeAllForUser(user.id);
  }

  private hashToken(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }
}
