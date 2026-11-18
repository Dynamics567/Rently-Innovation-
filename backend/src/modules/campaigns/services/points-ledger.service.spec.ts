import { PointsLedgerService } from './points-ledger.service';
import { PointsLedgerRepository } from '../repositories/points-ledger.repository';
import { AmbassadorProfileRepository } from '../repositories/ambassador-profile.repository';
import { UsersService } from '@modules/identity/services/users.service';
import { AuditLogService } from '@common/audit/audit-log.service';
import { PointsLedgerEntryType } from '../enums/points-ledger-entry-type.enum';

describe('PointsLedgerService', () => {
  let service: PointsLedgerService;
  let pointsLedgerRepository: Record<'create' | 'save' | 'getBalance' | 'getBalances' | 'findByAmbassadorId' | 'getLeaderboard', jest.Mock>;
  let ambassadorRepository: Record<'findByIdOrFail', jest.Mock>;
  let usersService: Record<'getBasicProfilesByIds', jest.Mock>;
  let auditLogService: Record<'record', jest.Mock>;

  beforeEach(() => {
    pointsLedgerRepository = {
      create: jest.fn((partial) => partial),
      save: jest.fn(async (entity) => ({ ...entity, id: 'entry-1' })),
      getBalance: jest.fn(async () => 15),
      getBalances: jest.fn(async () => new Map()),
      findByAmbassadorId: jest.fn(),
      getLeaderboard: jest.fn(async () => []),
    };
    ambassadorRepository = { findByIdOrFail: jest.fn(async () => ({ id: 'ambassador-1' })) };
    usersService = { getBasicProfilesByIds: jest.fn(async () => []) };
    auditLogService = { record: jest.fn(async () => undefined) };
    service = new PointsLedgerService(
      pointsLedgerRepository as unknown as PointsLedgerRepository,
      ambassadorRepository as unknown as AmbassadorProfileRepository,
      usersService as unknown as UsersService,
      auditLogService as unknown as AuditLogService,
    );
  });

  describe('record', () => {
    it('inserts an append-only entry with no surrounding manager by default', async () => {
      const entry = await service.record({
        ambassadorId: 'ambassador-1',
        type: PointsLedgerEntryType.MILESTONE_AWARD,
        pointsDelta: 5,
      });

      expect(pointsLedgerRepository.save).toHaveBeenCalled();
      expect(entry.id).toBe('entry-1');
    });
  });

  describe('getBalance', () => {
    it('delegates straight through to the repository', async () => {
      const balance = await service.getBalance('ambassador-1');
      expect(balance).toBe(15);
    });
  });

  describe('manualAdjust', () => {
    it('rejects a zero-point adjustment', async () => {
      await expect(service.manualAdjust('ambassador-1', 0, 'admin-1', 'Correction for a data error')).rejects.toMatchObject({
        code: 'VALIDATION_FAILED',
      });
      expect(pointsLedgerRepository.save).not.toHaveBeenCalled();
    });

    it('rejects a non-integer adjustment', async () => {
      await expect(service.manualAdjust('ambassador-1', 2.5, 'admin-1', 'Correction for a data error')).rejects.toMatchObject({
        code: 'VALIDATION_FAILED',
      });
    });

    it('records a negative adjustment (a correction) with the required reason, and audit-logs it', async () => {
      const entry = await service.manualAdjust('ambassador-1', -10, 'admin-1', 'Reversing a duplicate milestone award');

      expect(entry.pointsDelta).toBe(-10);
      expect(entry.type).toBe(PointsLedgerEntryType.MANUAL_ADJUSTMENT);
      expect(entry.createdByAdminId).toBe('admin-1');
      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'points_ledger.manual_adjust', actorId: 'admin-1' }),
      );
    });

    it('404s on an ambassador that does not exist', async () => {
      ambassadorRepository.findByIdOrFail.mockRejectedValue(new Error('not found'));

      await expect(service.manualAdjust('ghost', 5, 'admin-1', 'Some reason here')).rejects.toThrow();
      expect(pointsLedgerRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('getLeaderboard', () => {
    it('returns empty without a batch user lookup when there are no rows', async () => {
      const result = await service.getLeaderboard();

      expect(result).toEqual([]);
      expect(usersService.getBasicProfilesByIds).not.toHaveBeenCalled();
    });

    it('resolves every row\'s display name via one batch lookup, not one per row', async () => {
      pointsLedgerRepository.getLeaderboard.mockResolvedValue([
        { ambassadorId: 'a1', userId: 'u1', status: 'active', referralCode: 'AAAA1111', balance: 25, reachedAt: '2026-11-01T00:00:00Z' },
        { ambassadorId: 'a2', userId: 'u2', status: 'approved', referralCode: 'BBBB2222', balance: 10, reachedAt: '2026-11-05T00:00:00Z' },
      ]);
      usersService.getBasicProfilesByIds.mockResolvedValue([
        { id: 'u1', fullName: 'Ada Lovelace' },
        { id: 'u2', fullName: 'Grace Hopper' },
      ]);

      const result = await service.getLeaderboard(10);

      expect(usersService.getBasicProfilesByIds).toHaveBeenCalledTimes(1);
      expect(result[0]).toMatchObject({ ambassadorId: 'a1', balance: 25, name: 'Ada Lovelace' });
      expect(result[1]).toMatchObject({ ambassadorId: 'a2', balance: 10, name: 'Grace Hopper' });
    });
  });
});
