import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, IsNull } from 'typeorm';
import { DomainException } from '@common/errors/domain.exception';
import { ErrorCode } from '@common/errors/error-codes.enum';
import { AuditLogService } from '@common/audit/audit-log.service';
import { AuditActorType } from '@common/audit/audit-actor-type.enum';
import { CursorPage } from '@common/dto/cursor-pagination.dto';
import { ProviderProfileService } from '@modules/identity/services/provider-profile.service';
import { UsersService } from '@modules/identity/services/users.service';
import { Transaction } from '../entities/transaction.entity';
import { Settlement } from '../entities/settlement.entity';
import { TransactionType } from '../enums/transaction-type.enum';
import { SettlementStatus } from '../enums/settlement-status.enum';
import { TransactionRepository } from '../repositories/transaction.repository';
import { SettlementRepository } from '../repositories/settlement.repository';

interface RecordEntry {
  bookingId: string;
  amountMinor: number;
  renterId?: string | null;
  providerId?: string | null;
  disputeId?: string | null;
  paymentReference?: string | null;
}

export interface WalletBalance {
  providerId: string;
  providerName: string | null;
  unsettledMinor: number;
  lifetimeEarnedMinor: number;
}

/**
 * Turns the real charge/refund/release events PaymentPort already produces
 * on every booking into a permanent, queryable ledger — see Phase E's plan
 * for the full rationale. No real payment processor is integrated yet
 * (deliberate scope decision): `recordXxx` methods mirror the exact
 * PaymentPort call each one sits next to, and `markSettlementPaid` is an
 * honest manual bookkeeping action (an admin recording an off-platform bank
 * transfer), never a simulated automated payout.
 *
 * `recordProviderEarning`/`recordProviderForfeitCredit` are the one genuinely
 * new piece of behavior, not just a recording of an existing call: today,
 * when a dispute forfeits part of a deposit, that money is subtracted from
 * what's returned to the renter but nothing anywhere records that the
 * provider is now owed it (see BookingService.finalizeDispute's doc
 * comment). These two methods are the first real implementation of that
 * credit.
 *
 * Every `recordXxx` takes an optional EntityManager so it can run inside the
 * same DB transaction as the booking/dispute mutation that triggered it —
 * same signature convention as AuditLogService.record(entry, manager?).
 */
@Injectable()
export class FinanceService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly transactionRepository: TransactionRepository,
    private readonly settlementRepository: SettlementRepository,
    private readonly auditLogService: AuditLogService,
    private readonly providerProfileService: ProviderProfileService,
    private readonly usersService: UsersService,
  ) {}

  /** Best-effort, same `.catch(() => null)` cross-module convention BookingService.getDetailForAdmin() uses — a since-removed provider/renter shouldn't break a Finance screen. */
  private async getProviderName(providerId: string | null | undefined): Promise<string | null> {
    if (!providerId) return null;
    const provider = await this.providerProfileService.getPublicProfile(providerId).catch(() => null);
    return provider?.name ?? null;
  }

  private async getRenterName(renterId: string | null | undefined): Promise<string | null> {
    if (!renterId) return null;
    const renter = await this.usersService.getById(renterId).catch(() => null);
    return renter?.fullName ?? null;
  }

  private async insert(type: TransactionType, entry: RecordEntry, manager?: EntityManager): Promise<Transaction | null> {
    if (entry.amountMinor <= 0) return null; // nothing real happened — never record a zero-value ledger row
    if (manager) {
      const repo = manager.getRepository(Transaction);
      return repo.save(repo.create({ type, ...entry }));
    }
    return this.transactionRepository.save(this.transactionRepository.create({ type, ...entry }));
  }

  async recordCharge(entry: RecordEntry, manager?: EntityManager): Promise<Transaction | null> {
    return this.insert(TransactionType.CHARGE, entry, manager);
  }

  async recordRefund(entry: RecordEntry, manager?: EntityManager): Promise<Transaction | null> {
    return this.insert(TransactionType.REFUND, entry, manager);
  }

  async recordDepositRelease(entry: RecordEntry, manager?: EntityManager): Promise<Transaction | null> {
    return this.insert(TransactionType.DEPOSIT_RELEASE, entry, manager);
  }

  async recordProviderEarning(entry: RecordEntry, manager?: EntityManager): Promise<Transaction | null> {
    return this.insert(TransactionType.PROVIDER_EARNING, entry, manager);
  }

  async recordProviderForfeitCredit(entry: RecordEntry, manager?: EntityManager): Promise<Transaction | null> {
    return this.insert(TransactionType.PROVIDER_FORFEIT_CREDIT, entry, manager);
  }

  async searchTransactions(params: {
    type?: TransactionType;
    bookingId?: string;
    providerId?: string;
    from?: Date;
    to?: Date;
    cursor?: string;
    limit?: number;
  }): Promise<CursorPage<Transaction>> {
    return this.transactionRepository.search(params);
  }

  async getTransactionOrFail(id: string): Promise<Transaction & { renterName: string | null; providerName: string | null }> {
    const tx = await this.transactionRepository.findByIdOrFail(id, 'Transaction');
    const [renterName, providerName] = await Promise.all([
      this.getRenterName(tx.renterId),
      this.getProviderName(tx.providerId),
    ]);
    return Object.assign(tx, { renterName, providerName });
  }

  /** [Wallets view] A provider's balance — unsettled credits, never a stored figure (see Transaction entity's doc comment). */
  async computeWalletBalance(providerId: string): Promise<WalletBalance> {
    const [unsettledMinor, lifetimeEarnedMinor, providerName] = await Promise.all([
      this.transactionRepository.sumUnsettledForProvider(providerId),
      this.transactionRepository.sumLifetimeEarnedForProvider(providerId),
      this.getProviderName(providerId),
    ]);
    return { providerId, providerName, unsettledMinor, lifetimeEarnedMinor };
  }

  async listWallets(): Promise<Array<WalletBalance & { lastSettlementAt: Date | null }>> {
    const providerIds = await this.transactionRepository.listProviderIdsWithActivity();
    return Promise.all(
      providerIds.map(async (providerId) => {
        const [balance, lastSettlement] = await Promise.all([
          this.computeWalletBalance(providerId),
          this.settlementRepository.findLatestForProvider(providerId),
        ]);
        return { ...balance, lastSettlementAt: lastSettlement?.paidAt ?? null };
      }),
    );
  }

  async searchSettlements(params: {
    providerId?: string;
    cursor?: string;
    limit?: number;
  }): Promise<CursorPage<Settlement & { providerName: string | null }>> {
    const page = await this.settlementRepository.search(params);
    const data = await Promise.all(
      page.data.map(async (s) => Object.assign(s, { providerName: await this.getProviderName(s.providerId) })),
    );
    return { ...page, data };
  }

  async getSettlementOrFail(id: string): Promise<Settlement & { providerName: string | null }> {
    const settlement = await this.settlementRepository.findByIdOrFail(id, 'Settlement');
    const providerName = await this.getProviderName(settlement.providerId);
    return Object.assign(settlement, { providerName });
  }

  /**
   * [Admin, finance.settle] Computes a provider's current unsettled balance,
   * creates the Settlement row for that total, and stamps `settlementId` on
   * every transaction it just included — all atomically, so the balance
   * this Settlement claims always matches exactly the rows marked settled
   * by it (no second source of truth to drift).
   */
  async createSettlement(providerId: string, adminId: string): Promise<Settlement> {
    return this.dataSource.transaction(async (manager) => {
      const txRepo = manager.getRepository(Transaction);
      const unsettled = await txRepo.find({
        where: {
          providerId,
          settlementId: IsNull(),
          type: In([TransactionType.PROVIDER_EARNING, TransactionType.PROVIDER_FORFEIT_CREDIT]),
        },
      });
      const totalMinor = unsettled.reduce((sum, t) => sum + t.amountMinor, 0);
      if (!unsettled.length || totalMinor <= 0) {
        throw DomainException.unprocessable(
          ErrorCode.FINANCE_NO_UNSETTLED_BALANCE,
          'This Rental Partner has no unsettled balance to pay out.',
        );
      }

      const settlementRepo = manager.getRepository(Settlement);
      const settlement = settlementRepo.create({
        providerId,
        totalMinor,
        status: SettlementStatus.PENDING,
        createdByAdminId: adminId,
      });
      const saved = await settlementRepo.save(settlement);

      await txRepo.update({ id: In(unsettled.map((t) => t.id)) }, { settlementId: saved.id });

      await this.auditLogService.record(
        {
          actorId: adminId,
          actorType: AuditActorType.ADMIN,
          action: 'settlement.create',
          entityType: 'Settlement',
          entityId: saved.id,
          before: null,
          after: { providerId, totalMinor, transactionCount: unsettled.length },
        },
        manager,
      );

      return saved;
    });
  }

  /** [Admin, finance.settle] A manual bookkeeping record — no PaymentPort call, see this service's doc comment. */
  async markSettlementPaid(settlementId: string, reference: string, adminId: string): Promise<Settlement> {
    const settlement = await this.settlementRepository.findByIdOrFail(settlementId, 'Settlement');
    if (settlement.status === SettlementStatus.PAID) {
      throw DomainException.conflict(
        ErrorCode.FINANCE_SETTLEMENT_ALREADY_PAID,
        'This settlement has already been marked paid.',
      );
    }

    const before = { status: settlement.status };
    settlement.status = SettlementStatus.PAID;
    settlement.paidAt = new Date();
    settlement.paidReference = reference;
    settlement.paidByAdminId = adminId;
    const saved = await this.settlementRepository.save(settlement);

    await this.auditLogService.record({
      actorId: adminId,
      actorType: AuditActorType.ADMIN,
      action: 'settlement.mark_paid',
      entityType: 'Settlement',
      entityId: settlementId,
      before,
      after: { status: saved.status, paidReference: reference },
    });

    return saved;
  }
}
