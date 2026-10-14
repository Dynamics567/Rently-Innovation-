import { In } from 'typeorm';
import { FinanceService } from './finance.service';
import { TransactionRepository } from '../repositories/transaction.repository';
import { SettlementRepository } from '../repositories/settlement.repository';
import { AuditLogService } from '@common/audit/audit-log.service';
import { ProviderProfileService } from '@modules/identity/services/provider-profile.service';
import { UsersService } from '@modules/identity/services/users.service';
import { TransactionType } from '../enums/transaction-type.enum';
import { SettlementStatus } from '../enums/settlement-status.enum';

/**
 * Unit-level, same shape as the other *.service.spec.ts files in this repo.
 * `createSettlement`/`markSettlementPaid` go through `dataSource.transaction`
 * with `manager.getRepository(...)` fakes, same pattern booking.service.spec.ts
 * uses — everything else is a direct repository-method mock.
 */
describe('FinanceService', () => {
  let service: FinanceService;
  let transactionRepository: Record<
    'create' | 'save' | 'search' | 'findByIdOrFail' | 'sumUnsettledForProvider' | 'sumLifetimeEarnedForProvider' | 'listProviderIdsWithActivity',
    jest.Mock
  >;
  let settlementRepository: Record<'save' | 'findByIdOrFail' | 'search' | 'findLatestForProvider', jest.Mock>;
  let auditLogService: Record<'record', jest.Mock>;
  let providerProfileService: Record<'getPublicProfile', jest.Mock>;
  let usersService: Record<'getById', jest.Mock>;
  let dataSource: { transaction: jest.Mock };

  function fakeRepo() {
    return {
      create: jest.fn((partial: object) => ({ ...partial })),
      save: jest.fn(async (entity: { id?: string }) => ({ id: entity.id ?? 'generated-id', ...entity })),
      find: jest.fn(async () => []),
      update: jest.fn(async () => undefined),
    };
  }

  beforeEach(() => {
    transactionRepository = {
      create: jest.fn((partial: object) => ({ ...partial })),
      save: jest.fn(async (entity: object) => ({ id: 'tx-1', ...entity })),
      search: jest.fn(),
      findByIdOrFail: jest.fn(),
      sumUnsettledForProvider: jest.fn(async () => 0),
      sumLifetimeEarnedForProvider: jest.fn(async () => 0),
      listProviderIdsWithActivity: jest.fn(async () => []),
    };
    settlementRepository = {
      save: jest.fn(async (entity: object) => ({ id: 'settlement-1', ...entity })),
      findByIdOrFail: jest.fn(),
      search: jest.fn(),
      findLatestForProvider: jest.fn(async () => null),
    };
    auditLogService = { record: jest.fn(async () => undefined) };
    providerProfileService = { getPublicProfile: jest.fn(async () => null) };
    usersService = { getById: jest.fn(async () => null) };
    dataSource = { transaction: jest.fn((cb: (m: unknown) => unknown) => cb({ getRepository: () => fakeRepo() })) };

    service = new FinanceService(
      dataSource as any,
      transactionRepository as unknown as TransactionRepository,
      settlementRepository as unknown as SettlementRepository,
      auditLogService as unknown as AuditLogService,
      providerProfileService as unknown as ProviderProfileService,
      usersService as unknown as UsersService,
    );
  });

  describe('recordCharge / recordRefund / recordDepositRelease / recordProviderEarning / recordProviderForfeitCredit', () => {
    it('inserts a row of the right type for a non-manager call', async () => {
      await service.recordCharge({ bookingId: 'booking-1', renterId: 'renter-1', amountMinor: 78000, paymentReference: 'MOCK-REF' });

      expect(transactionRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ type: TransactionType.CHARGE, bookingId: 'booking-1', amountMinor: 78000 }),
      );
    });

    it('inserts via the supplied manager instead of its own repository when one is given', async () => {
      const managerRepo = fakeRepo();
      const manager = { getRepository: jest.fn(() => managerRepo) };

      await service.recordRefund({ bookingId: 'booking-1', renterId: 'renter-1', amountMinor: 40000 }, manager as any);

      expect(managerRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ type: TransactionType.REFUND, amountMinor: 40000 }),
      );
      expect(transactionRepository.save).not.toHaveBeenCalled();
    });

    it('never records a zero-amount row — nothing real happened', async () => {
      await service.recordDepositRelease({ bookingId: 'booking-1', renterId: 'renter-1', amountMinor: 0 });

      expect(transactionRepository.save).not.toHaveBeenCalled();
    });

    it('records a provider earning credit', async () => {
      await service.recordProviderEarning({ bookingId: 'booking-1', providerId: 'provider-1', amountMinor: 60000 });

      expect(transactionRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ type: TransactionType.PROVIDER_EARNING, providerId: 'provider-1', amountMinor: 60000 }),
      );
    });

    it('records a provider forfeit credit tied to the dispute', async () => {
      await service.recordProviderForfeitCredit({
        bookingId: 'booking-1',
        providerId: 'provider-1',
        amountMinor: 5000,
        disputeId: 'dispute-1',
      });

      expect(transactionRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ type: TransactionType.PROVIDER_FORFEIT_CREDIT, disputeId: 'dispute-1', amountMinor: 5000 }),
      );
    });
  });

  describe('getTransactionOrFail', () => {
    it('resolves renter and provider names onto the raw row', async () => {
      transactionRepository.findByIdOrFail.mockResolvedValue({
        id: 'tx-1',
        bookingId: 'booking-1',
        renterId: 'renter-1',
        providerId: 'provider-1',
      });
      usersService.getById.mockResolvedValue({ fullName: 'Test Renter' });
      providerProfileService.getPublicProfile.mockResolvedValue({ name: 'EventCraft NG' });

      const result = await service.getTransactionOrFail('tx-1');

      expect(result.renterName).toBe('Test Renter');
      expect(result.providerName).toBe('EventCraft NG');
    });

    it('degrades gracefully when the renter/provider lookup fails', async () => {
      transactionRepository.findByIdOrFail.mockResolvedValue({ id: 'tx-1', bookingId: 'booking-1', renterId: null, providerId: null });

      const result = await service.getTransactionOrFail('tx-1');

      expect(result.renterName).toBeNull();
      expect(result.providerName).toBeNull();
    });
  });

  describe('computeWalletBalance', () => {
    it('sums unsettled and lifetime credits independently and resolves the provider name', async () => {
      transactionRepository.sumUnsettledForProvider.mockResolvedValue(15000);
      transactionRepository.sumLifetimeEarnedForProvider.mockResolvedValue(260000);
      providerProfileService.getPublicProfile.mockResolvedValue({ name: 'EventCraft NG' });

      const result = await service.computeWalletBalance('provider-1');

      expect(result).toEqual({
        providerId: 'provider-1',
        providerName: 'EventCraft NG',
        unsettledMinor: 15000,
        lifetimeEarnedMinor: 260000,
      });
    });
  });

  describe('createSettlement', () => {
    it('rejects creating a settlement when the provider has no unsettled balance', async () => {
      const manager = { getRepository: jest.fn(() => ({ ...fakeRepo(), find: jest.fn(async () => []) })) };
      dataSource.transaction.mockImplementation((cb: (m: unknown) => unknown) => cb(manager));

      await expect(service.createSettlement('provider-1', 'admin-1')).rejects.toMatchObject({
        code: 'FINANCE_NO_UNSETTLED_BALANCE',
      });
    });

    it('computes the total from unsettled transactions, stamps settlementId on exactly those rows, and audit-logs it', async () => {
      const unsettled = [
        { id: 'tx-1', amountMinor: 60000 },
        { id: 'tx-2', amountMinor: 5000 },
      ];
      const txManagerRepo = { ...fakeRepo(), find: jest.fn(async () => unsettled) };
      const settlementManagerRepo = { ...fakeRepo(), save: jest.fn(async (entity: object) => ({ id: 'settlement-1', ...entity })) };
      // Two distinct entity classes (Transaction, Settlement) each get their own
      // repo — order of the first two getRepository() calls inside createSettlement
      // is fixed (Transaction first, then Settlement), so keying off call order
      // is reliable here without needing real TypeORM entity identity.
      let call = 0;
      const manager = { getRepository: jest.fn(() => (call++ === 0 ? txManagerRepo : settlementManagerRepo)) };
      dataSource.transaction.mockImplementation((cb: (m: unknown) => unknown) => cb(manager));

      const result = await service.createSettlement('provider-1', 'admin-1');

      expect(result).toEqual(expect.objectContaining({ providerId: 'provider-1', totalMinor: 65000, status: SettlementStatus.PENDING }));
      expect(txManagerRepo.update).toHaveBeenCalledWith({ id: In(['tx-1', 'tx-2']) }, { settlementId: 'settlement-1' });
      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'settlement.create',
          entityType: 'Settlement',
          after: expect.objectContaining({ providerId: 'provider-1', totalMinor: 65000, transactionCount: 2 }),
        }),
        manager,
      );
    });
  });

  describe('markSettlementPaid', () => {
    it('rejects marking an already-paid settlement paid again', async () => {
      settlementRepository.findByIdOrFail.mockResolvedValue({ id: 'settlement-1', status: SettlementStatus.PAID });

      await expect(service.markSettlementPaid('settlement-1', 'ref', 'admin-1')).rejects.toMatchObject({
        code: 'FINANCE_SETTLEMENT_ALREADY_PAID',
      });
    });

    it('marks a pending settlement paid with the given reference and audit-logs it — a manual record, no payment call', async () => {
      settlementRepository.findByIdOrFail.mockResolvedValue({ id: 'settlement-1', status: SettlementStatus.PENDING });

      const result = await service.markSettlementPaid('settlement-1', 'Bank transfer ref #1234', 'admin-1');

      expect(result).toEqual(
        expect.objectContaining({ status: SettlementStatus.PAID, paidReference: 'Bank transfer ref #1234', paidByAdminId: 'admin-1' }),
      );
      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'settlement.mark_paid', entityType: 'Settlement', entityId: 'settlement-1' }),
      );
    });
  });
});
