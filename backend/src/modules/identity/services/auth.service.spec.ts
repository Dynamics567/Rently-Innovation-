import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UserRepository } from '../repositories/user.repository';
import { PasswordResetTokenRepository } from '../repositories/password-reset-token.repository';
import { TokenService } from './token.service';
import { OtpService } from './otp.service';
import { EmailSender } from './email-sender.port';
import { UserAccountStatus } from '../enums/verification-status.enum';
import { UserRole } from '../enums/user-role.enum';

/**
 * Unit-level: every collaborator is a hand-rolled mock, not a real database
 * or HTTP call. This is what a Service test should look like per
 * docs/TESTING_STRATEGY.md — fast, deterministic, and testing AuthService's
 * *decisions* (reject a duplicate signup, reject a bad password) rather than
 * TypeORM's or bcrypt's behavior.
 */
describe('AuthService', () => {
  let authService: AuthService;
  // Loosely typed as `jest.Mock`-bearing records, deliberately — these are
  // hand-rolled test doubles, not required to satisfy the full collaborator
  // interface, only the methods AuthService actually calls.
  let userRepository: Record<
    'findByEmailOrPhone' | 'findByEmail' | 'create' | 'save' | 'findByIdOrFail',
    jest.Mock
  >;
  let passwordResetTokenRepository: Record<'create' | 'save' | 'findByTokenHash', jest.Mock>;
  let tokenService: Record<'issueTokenPair' | 'revokeAllForUser', jest.Mock>;
  let otpService: Record<'requestOtp', jest.Mock>;
  let configService: { get: jest.Mock };
  let emailSender: Record<'send', jest.Mock>;

  beforeEach(() => {
    userRepository = {
      findByEmailOrPhone: jest.fn(),
      findByEmail: jest.fn(),
      create: jest.fn((partial) => partial),
      save: jest.fn(async (entity) => ({ ...entity, id: 'user-1' })),
      findByIdOrFail: jest.fn(),
    };
    passwordResetTokenRepository = {
      create: jest.fn((partial) => partial),
      save: jest.fn(async (entity) => ({ ...entity, id: 'reset-token-1' })),
      findByTokenHash: jest.fn(),
    };
    tokenService = {
      issueTokenPair: jest.fn(async () => ({ accessToken: 'access', refreshToken: 'refresh' })),
      revokeAllForUser: jest.fn(async () => undefined),
    };
    otpService = { requestOtp: jest.fn(async () => undefined) };
    configService = { get: jest.fn(() => ({ frontendUrl: 'https://rentlyhub.com.ng' })) };
    emailSender = { send: jest.fn(async () => undefined) };

    authService = new AuthService(
      userRepository as unknown as UserRepository,
      passwordResetTokenRepository as unknown as PasswordResetTokenRepository,
      tokenService as unknown as TokenService,
      otpService as unknown as OtpService,
      configService as any,
      emailSender as unknown as EmailSender,
    );
  });

  describe('signup', () => {
    it('rejects signup when the email or phone is already registered', async () => {
      userRepository.findByEmailOrPhone.mockResolvedValue({ id: 'existing-user' } as any);

      await expect(
        authService.signup({
          email: 'taken@example.com',
          password: 'password123',
          fullName: 'Test User',
        } as any),
      ).rejects.toMatchObject({ code: 'EMAIL_ALREADY_REGISTERED' });

      expect(userRepository.save).not.toHaveBeenCalled();
    });

    it('creates a Renter by default when no roles are specified', async () => {
      userRepository.findByEmailOrPhone.mockResolvedValue(null);

      await authService.signup({
        email: 'new@example.com',
        password: 'password123',
        fullName: 'Test User',
      } as any);

      expect(userRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ roles: [UserRole.RENTER] }),
      );
    });

    it('grants renter alongside an explicitly requested role, never in its place', async () => {
      userRepository.findByEmailOrPhone.mockResolvedValue(null);

      await authService.signup({
        email: 'provider@example.com',
        password: 'password123',
        fullName: 'Test Provider',
        roles: [UserRole.PROVIDER],
      } as any);

      const created = userRepository.create.mock.calls[0][0];
      expect(created.roles).toEqual(expect.arrayContaining([UserRole.RENTER, UserRole.PROVIDER]));
      expect(created.roles).toHaveLength(2);
    });
  });

  describe('login', () => {
    it('rejects an unknown identifier with the same error as a wrong password (no user enumeration)', async () => {
      userRepository.findByEmailOrPhone.mockResolvedValue(null);

      await expect(
        authService.login({ email: 'ghost@example.com', password: 'whatever' } as any),
      ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
    });

    it('rejects a correct identifier with a wrong password', async () => {
      const passwordHash = await bcrypt.hash('correct-password', 4);
      userRepository.findByEmailOrPhone.mockResolvedValue({
        id: 'user-1',
        passwordHash,
        status: UserAccountStatus.ACTIVE,
      } as any);

      await expect(
        authService.login({ email: 'user@example.com', password: 'wrong-password' } as any),
      ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
    });

    it('rejects a suspended account even with the correct password', async () => {
      const passwordHash = await bcrypt.hash('correct-password', 4);
      userRepository.findByEmailOrPhone.mockResolvedValue({
        id: 'user-1',
        passwordHash,
        status: UserAccountStatus.SUSPENDED,
      } as any);

      await expect(
        authService.login({ email: 'user@example.com', password: 'correct-password' } as any),
      ).rejects.toMatchObject({ code: 'ACCOUNT_SUSPENDED' });
    });

    it('issues a token pair on valid credentials', async () => {
      const passwordHash = await bcrypt.hash('correct-password', 4);
      const user = { id: 'user-1', passwordHash, status: UserAccountStatus.ACTIVE };
      userRepository.findByEmailOrPhone.mockResolvedValue(user as any);

      const result = await authService.login({
        email: 'user@example.com',
        password: 'correct-password',
      } as any);

      expect(tokenService.issueTokenPair).toHaveBeenCalledWith(user);
      expect(result.tokens).toEqual({ accessToken: 'access', refreshToken: 'refresh' });
    });
  });

  describe('requestPasswordReset', () => {
    it('resolves silently for an email with no account (no user enumeration)', async () => {
      userRepository.findByEmail.mockResolvedValue(null);

      await expect(authService.requestPasswordReset('ghost@example.com')).resolves.toBeUndefined();
      expect(passwordResetTokenRepository.save).not.toHaveBeenCalled();
      expect(emailSender.send).not.toHaveBeenCalled();
    });

    it('saves a hashed token and emails a reset link for a known account', async () => {
      userRepository.findByEmail.mockResolvedValue({ id: 'user-1' } as any);

      await authService.requestPasswordReset('user@example.com');

      expect(passwordResetTokenRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-1', tokenHash: expect.any(String) }),
      );
      // The raw token must never be persisted — only its hash.
      const saved = passwordResetTokenRepository.save.mock.calls[0][0];
      expect(saved.tokenHash).not.toContain('resetToken=');

      expect(emailSender.send).toHaveBeenCalledWith(
        'user@example.com',
        expect.any(String),
        expect.stringContaining('https://rentlyhub.com.ng/auth?resetToken='),
      );
    });
  });

  describe('resetPassword', () => {
    it('rejects an unknown token', async () => {
      passwordResetTokenRepository.findByTokenHash.mockResolvedValue(null);

      await expect(authService.resetPassword('bad-token', 'newpassword123')).rejects.toMatchObject({
        code: 'PASSWORD_RESET_TOKEN_INVALID',
      });
    });

    it('rejects an expired or already-used token', async () => {
      passwordResetTokenRepository.findByTokenHash.mockResolvedValue({
        isActive: () => false,
      } as any);

      await expect(authService.resetPassword('stale-token', 'newpassword123')).rejects.toMatchObject({
        code: 'PASSWORD_RESET_TOKEN_INVALID',
      });
    });

    it('updates the password, marks the token used, and revokes every session on success', async () => {
      const resetToken = { userId: 'user-1', isActive: () => true, usedAt: null as Date | null };
      passwordResetTokenRepository.findByTokenHash.mockResolvedValue(resetToken as any);
      userRepository.findByIdOrFail.mockResolvedValue({ id: 'user-1', passwordHash: 'old-hash' } as any);

      await authService.resetPassword('valid-token', 'newpassword123');

      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ passwordHash: expect.not.stringMatching('old-hash') }),
      );
      expect(resetToken.usedAt).not.toBeNull();
      expect(passwordResetTokenRepository.save).toHaveBeenCalledWith(resetToken);
      expect(tokenService.revokeAllForUser).toHaveBeenCalledWith('user-1');
    });
  });
});
