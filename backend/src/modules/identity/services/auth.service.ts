import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { DomainException } from '@common/errors/domain.exception';
import { ErrorCode } from '@common/errors/error-codes.enum';
import { UserRepository } from '../repositories/user.repository';
import { TokenService, TokenPair } from './token.service';
import { OtpService } from './otp.service';
import { SignupDto } from '../dto/signup.dto';
import { LoginDto } from '../dto/login.dto';
import { User } from '../entities/user.entity';
import { UserRole } from '../enums/user-role.enum';
import { UserAccountStatus } from '../enums/verification-status.enum';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly tokenService: TokenService,
    private readonly otpService: OtpService,
  ) {}

  async signup(dto: SignupDto): Promise<{ user: User; tokens: TokenPair }> {
    const existing = await this.userRepository.findByEmailOrPhone({ email: dto.email, phone: dto.phone });
    if (existing) {
      throw DomainException.conflict(
        ErrorCode.EMAIL_ALREADY_REGISTERED,
        'An account with this email or phone already exists.',
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = this.userRepository.create({
      email: dto.email,
      phone: dto.phone,
      passwordHash,
      fullName: dto.fullName,
      roles: dto.roles?.length ? dto.roles : [UserRole.RENTER],
    });
    await this.userRepository.save(user);

    if (dto.phone) {
      await this.otpService.requestOtp(dto.phone);
    }

    const tokens = await this.tokenService.issueTokenPair(user);
    return { user, tokens };
  }

  async login(dto: LoginDto): Promise<{ user: User; tokens: TokenPair }> {
    const user = await this.userRepository.findByEmailOrPhone({ email: dto.email, phone: dto.phone });
    // Constant-shape response whether the account exists or the password is
    // wrong — never reveal which one failed, that's a user-enumeration leak.
    const passwordMatches = user?.passwordHash
      ? await bcrypt.compare(dto.password, user.passwordHash)
      : await bcrypt.compare(dto.password, '$2b$12$invalidsaltinvalidsaltinvalidsal.');

    if (!user || !passwordMatches) {
      throw DomainException.unauthorized(ErrorCode.INVALID_CREDENTIALS, 'Incorrect email/phone or password.');
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
}
