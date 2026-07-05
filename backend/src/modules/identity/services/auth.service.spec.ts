import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UserRepository } from '../repositories/user.repository';
import { TokenService } from './token.service';
import { OtpService } from './otp.service';
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
  let userRepository: Record<'findByEmailOrPhone' | 'create' | 'save' | 'findByIdOrFail', jest.Mock>;
  let tokenService: Record<'issueTokenPair', jest.Mock>;
  let otpService: Record<'requestOtp', jest.Mock>;

  beforeEach(() => {
    userRepository = {
      findByEmailOrPhone: jest.fn(),
      create: jest.fn((partial) => partial),
      save: jest.fn(async (entity) => ({ ...entity, id: 'user-1' })),
      findByIdOrFail: jest.fn(),
    };
    tokenService = {
      issueTokenPair: jest.fn(async () => ({ accessToken: 'access', refreshToken: 'refresh' })),
    };
    otpService = { requestOtp: jest.fn(async () => undefined) };

    authService = new AuthService(
      userRepository as unknown as UserRepository,
      tokenService as unknown as TokenService,
      otpService as unknown as OtpService,
    );
  });

  describe('signup', () => {
    it('rejects signup when the email or phone is already registered', async () => {
      userRepository.findByEmailOrPhone.mockResolvedValue({ id: 'existing-user' } as any);

      await expect(
        authService.signup({ email: 'taken@example.com', password: 'password123', fullName: 'Test User' } as any),
      ).rejects.toMatchObject({ code: 'EMAIL_ALREADY_REGISTERED' });

      expect(userRepository.save).not.toHaveBeenCalled();
    });

    it('creates a Renter by default when no roles are specified', async () => {
      userRepository.findByEmailOrPhone.mockResolvedValue(null);

      await authService.signup({ email: 'new@example.com', password: 'password123', fullName: 'Test User' } as any);

      expect(userRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ roles: [UserRole.RENTER] }),
      );
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

      const result = await authService.login({ email: 'user@example.com', password: 'correct-password' } as any);

      expect(tokenService.issueTokenPair).toHaveBeenCalledWith(user);
      expect(result.tokens).toEqual({ accessToken: 'access', refreshToken: 'refresh' });
    });
  });
});
