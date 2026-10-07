import { UsersService } from './users.service';
import { UserRepository } from '../repositories/user.repository';
import { AdminInviteRepository } from '../repositories/admin-invite.repository';
import { AuditLogService } from '@common/audit/audit-log.service';
import { UserAccountStatus } from '../enums/verification-status.enum';
import { UserRole } from '../enums/user-role.enum';

/**
 * Unit-level, same shape as the other *.service.spec.ts files in this repo:
 * every collaborator is a hand-rolled mock, no real database.
 */
describe('UsersService', () => {
  let service: UsersService;
  let userRepository: Record<'findByIdOrFail' | 'findByEmail' | 'save' | 'searchForAdmin' | 'countAll' | 'findAdmins' | 'countSignupsByDay' | 'softDelete', jest.Mock>;
  let adminInviteRepository: Record<'create' | 'save' | 'findByIdOrFail' | 'findPending', jest.Mock>;
  let auditLogService: Record<'record', jest.Mock>;
  let configService: { get: jest.Mock };
  let emailSender: Record<'send', jest.Mock>;

  beforeEach(() => {
    userRepository = {
      findByIdOrFail: jest.fn(async () => ({ id: 'user-1', status: UserAccountStatus.ACTIVE, roles: [UserRole.RENTER] })),
      findByEmail: jest.fn(async () => null),
      save: jest.fn(async (u: unknown) => u),
      searchForAdmin: jest.fn(),
      countAll: jest.fn(async () => 42),
      findAdmins: jest.fn(async () => []),
      countSignupsByDay: jest.fn(async () => [{ date: '2026-10-01', count: 3 }]),
      softDelete: jest.fn(async () => undefined),
    };
    adminInviteRepository = {
      create: jest.fn((partial) => partial),
      save: jest.fn(async (entity) => ({ ...entity, id: 'invite-1' })),
      findByIdOrFail: jest.fn(async () => ({ id: 'invite-1', revokedAt: null })),
      findPending: jest.fn(async () => []),
    };
    auditLogService = { record: jest.fn(async () => undefined) };
    configService = { get: jest.fn(() => ({ frontendUrl: 'https://rentlyhub.com.ng' })) };
    emailSender = { send: jest.fn(async () => undefined) };
    service = new UsersService(
      userRepository as unknown as UserRepository,
      adminInviteRepository as unknown as AdminInviteRepository,
      auditLogService as unknown as AuditLogService,
      configService as any,
      emailSender as unknown as any,
    );
  });

  describe('searchForAdmin', () => {
    it('delegates straight through to the repository with the given query/cursor/limit', async () => {
      userRepository.searchForAdmin.mockResolvedValue({ data: [], meta: { hasMore: false, nextCursor: null } });

      await service.searchForAdmin('bola', 'some-cursor', 10);

      expect(userRepository.searchForAdmin).toHaveBeenCalledWith('bola', 'some-cursor', 10);
    });
  });

  describe('setStatus', () => {
    it('rejects suspending an account without a reason of at least 5 characters', async () => {
      await expect(service.setStatus('user-1', UserAccountStatus.SUSPENDED, 'admin-1', 'bad')).rejects.toMatchObject({
        code: 'VALIDATION_FAILED',
      });
      expect(userRepository.save).not.toHaveBeenCalled();
    });

    it('suspends with a valid reason and writes an audit log entry capturing before/after status', async () => {
      const result = await service.setStatus('user-1', UserAccountStatus.SUSPENDED, 'admin-1', 'Repeated no-shows');

      expect(result.status).toBe(UserAccountStatus.SUSPENDED);
      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'user.set_status',
          entityType: 'User',
          entityId: 'user-1',
          before: { status: UserAccountStatus.ACTIVE },
          after: { status: UserAccountStatus.SUSPENDED, reason: 'Repeated no-shows' },
        }),
      );
    });

    it('reinstating to active does not require a reason', async () => {
      userRepository.findByIdOrFail.mockResolvedValue({ id: 'user-1', status: UserAccountStatus.SUSPENDED });

      const result = await service.setStatus('user-1', UserAccountStatus.ACTIVE, 'admin-1');

      expect(result.status).toBe(UserAccountStatus.ACTIVE);
    });
  });

  describe('removeAsAdmin', () => {
    it('soft-deletes the account and audit-logs the before state', async () => {
      userRepository.findByIdOrFail.mockResolvedValue({
        id: 'user-1',
        email: 'junk@example.com',
        fullName: 'Junk Test',
        status: UserAccountStatus.ACTIVE,
      });

      await service.removeAsAdmin('user-1', 'admin-1');

      expect(userRepository.softDelete).toHaveBeenCalledWith('user-1');
      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'user.remove',
          entityType: 'User',
          entityId: 'user-1',
          before: { email: 'junk@example.com', fullName: 'Junk Test', status: UserAccountStatus.ACTIVE },
          after: { deleted: true },
        }),
      );
    });
  });

  describe('getStats', () => {
    it('reports the real total user count from the repository', async () => {
      const result = await service.getStats();
      expect(result).toEqual({ totalUsers: 42 });
    });
  });

  describe('getSignupTrend', () => {
    it('delegates to the repository with the given day window', async () => {
      const result = await service.getSignupTrend(14);
      expect(userRepository.countSignupsByDay).toHaveBeenCalledWith(14);
      expect(result).toEqual([{ date: '2026-10-01', count: 3 }]);
    });
  });

  describe('addRole', () => {
    it('adds a role on top of existing ones, never replacing them (unlike setRoles)', async () => {
      userRepository.findByIdOrFail.mockResolvedValue({ id: 'user-1', roles: [UserRole.RENTER, UserRole.PROVIDER] });

      const result = await service.addRole('user-1', UserRole.ADMIN, 'super-admin-1');

      expect(result.roles).toEqual(expect.arrayContaining([UserRole.RENTER, UserRole.PROVIDER, UserRole.ADMIN]));
      expect(auditLogService.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'user.add_role' }));
    });
  });

  describe('inviteAdmin', () => {
    it('grants the role immediately when an account with that email already exists', async () => {
      userRepository.findByEmail.mockResolvedValue({ id: 'existing-1', roles: [UserRole.RENTER] });
      userRepository.findByIdOrFail.mockResolvedValue({ id: 'existing-1', roles: [UserRole.RENTER] });

      const result = await service.inviteAdmin('existing@example.com', UserRole.ADMIN, 'super-admin-1');

      expect(result.granted).toBe(true);
      expect(emailSender.send).toHaveBeenCalledWith(
        'existing@example.com',
        expect.stringContaining('admin access'),
        expect.any(String),
      );
      expect(adminInviteRepository.save).not.toHaveBeenCalled();
    });

    it('creates a pending invite and emails a signup link when no account exists yet', async () => {
      userRepository.findByEmail.mockResolvedValue(null);

      const result = await service.inviteAdmin('newperson@example.com', UserRole.ADMIN, 'super-admin-1');

      expect(result.granted).toBe(false);
      expect(adminInviteRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'newperson@example.com', role: UserRole.ADMIN }),
      );
      expect(emailSender.send).toHaveBeenCalledWith(
        'newperson@example.com',
        expect.stringContaining('invited'),
        expect.stringContaining('inviteToken='),
      );
    });

    it('does not let an email-delivery failure block the invite/grant itself', async () => {
      userRepository.findByEmail.mockResolvedValue(null);
      emailSender.send.mockRejectedValue(new Error('Resend outage'));

      await expect(service.inviteAdmin('newperson@example.com', UserRole.ADMIN, 'super-admin-1')).resolves.toMatchObject({
        granted: false,
      });
      expect(adminInviteRepository.save).toHaveBeenCalled();
    });
  });

  describe('revokeInvite', () => {
    it('marks the invite revoked and audit-logs it', async () => {
      const result = await service.revokeInvite('invite-1', 'super-admin-1');

      expect(result.revokedAt).toBeInstanceOf(Date);
      expect(auditLogService.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'admin_invite.revoke' }));
    });
  });
});
