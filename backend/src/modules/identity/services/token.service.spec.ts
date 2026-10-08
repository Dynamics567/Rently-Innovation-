import { TokenService } from './token.service';
import { User } from '../entities/user.entity';
import { UserRole } from '../enums/user-role.enum';

/**
 * Unit-level, same shape as the other *.service.spec.ts files in this repo:
 * every collaborator is a hand-rolled mock, no real database.
 *
 * This file didn't exist before a real bug shipped undetected: logout's
 * revokeAllForUser() filtered on `revokedAt: undefined`, which TypeORM/pg
 * renders as `"revoked_at" = NULL` — never true for any row under SQL's
 * three-valued logic — so logout silently revoked nothing, ever. The mock
 * in auth.service.spec.ts only verified that revokeAllForUser was *called*,
 * never that its own query logic was correct, which is exactly the gap a
 * dedicated TokenService suite closes.
 */
describe('TokenService', () => {
  let service: TokenService;
  let jwtService: { sign: jest.Mock };
  let configService: { get: jest.Mock };
  let refreshTokenRepo: Record<'save' | 'create' | 'findOne' | 'update', jest.Mock>;

  const user = { id: 'user-1', roles: [UserRole.RENTER] } as User;

  beforeEach(() => {
    jwtService = { sign: jest.fn(() => 'signed.jwt.token') };
    configService = {
      get: jest.fn(() => ({
        accessSecret: 'secret',
        accessExpiresIn: '15m',
        refreshExpiresIn: '30d',
      })),
    };
    refreshTokenRepo = {
      save: jest.fn(async (e: unknown) => e),
      create: jest.fn((partial) => partial),
      findOne: jest.fn(),
      update: jest.fn(async () => undefined),
    };
    service = new TokenService(jwtService as any, configService as any, refreshTokenRepo as any);
  });

  describe('revokeAllForUser', () => {
    it('updates by userId alone — not a `revokedAt: undefined` filter that would match zero rows', async () => {
      await service.revokeAllForUser('user-1');

      expect(refreshTokenRepo.update).toHaveBeenCalledTimes(1);
      const [criteria, patch] = refreshTokenRepo.update.mock.calls[0];
      expect(criteria).toEqual({ userId: 'user-1' });
      expect(criteria).not.toHaveProperty('revokedAt');
      expect(patch.revokedAt).toBeInstanceOf(Date);
    });
  });

  describe('rotateRefreshToken', () => {
    it('rejects a token that does not exist', async () => {
      refreshTokenRepo.findOne.mockResolvedValue(null);

      await expect(service.rotateRefreshToken('raw-token', user)).rejects.toMatchObject({
        code: 'REFRESH_TOKEN_INVALID',
      });
    });

    it('rejects a token that belongs to a different user', async () => {
      refreshTokenRepo.findOne.mockResolvedValue({
        userId: 'someone-else',
        isActive: () => true,
      });

      await expect(service.rotateRefreshToken('raw-token', user)).rejects.toMatchObject({
        code: 'REFRESH_TOKEN_INVALID',
      });
    });

    it('treats redemption of an already-revoked token as theft and revokes everything for that user', async () => {
      refreshTokenRepo.findOne.mockResolvedValue({
        userId: 'user-1',
        isActive: () => false,
      });

      await expect(service.rotateRefreshToken('raw-token', user)).rejects.toMatchObject({
        code: 'REFRESH_TOKEN_INVALID',
      });
      expect(refreshTokenRepo.update).toHaveBeenCalledWith({ userId: 'user-1' }, expect.objectContaining({ revokedAt: expect.any(Date) }));
    });

    it('rotates an active token: issues a new pair and revokes the old one', async () => {
      const existing = { userId: 'user-1', isActive: () => true, revokedAt: null as Date | null };
      refreshTokenRepo.findOne.mockResolvedValue(existing);

      const result = await service.rotateRefreshToken('raw-token', user);

      expect(result.accessToken).toBe('signed.jwt.token');
      expect(typeof result.refreshToken).toBe('string');
      expect(existing.revokedAt).toBeInstanceOf(Date);
      expect(refreshTokenRepo.save).toHaveBeenCalledWith(existing);
    });
  });

  describe('findUserIdByRefreshToken', () => {
    it('resolves the owning userId for a known token', async () => {
      refreshTokenRepo.findOne.mockResolvedValue({ userId: 'user-1' });

      await expect(service.findUserIdByRefreshToken('raw-token')).resolves.toBe('user-1');
    });

    it('rejects an unknown token', async () => {
      refreshTokenRepo.findOne.mockResolvedValue(null);

      await expect(service.findUserIdByRefreshToken('raw-token')).rejects.toMatchObject({
        code: 'REFRESH_TOKEN_INVALID',
      });
    });
  });
});
