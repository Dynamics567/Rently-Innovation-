import { UsersService } from './users.service';
import { UserRepository } from '../repositories/user.repository';
import { AuditLogService } from '@common/audit/audit-log.service';
import { UserAccountStatus } from '../enums/verification-status.enum';

/**
 * Unit-level, same shape as the other *.service.spec.ts files in this repo:
 * every collaborator is a hand-rolled mock, no real database.
 */
describe('UsersService', () => {
  let service: UsersService;
  let userRepository: Record<'findByIdOrFail' | 'save' | 'searchForAdmin', jest.Mock>;
  let auditLogService: Record<'record', jest.Mock>;

  beforeEach(() => {
    userRepository = {
      findByIdOrFail: jest.fn(async () => ({ id: 'user-1', status: UserAccountStatus.ACTIVE })),
      save: jest.fn(async (u: unknown) => u),
      searchForAdmin: jest.fn(),
    };
    auditLogService = { record: jest.fn(async () => undefined) };
    service = new UsersService(
      userRepository as unknown as UserRepository,
      auditLogService as unknown as AuditLogService,
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
});
