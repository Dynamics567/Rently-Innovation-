import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from '@common/base/base.repository';
import { CursorPage } from '@common/dto/cursor-pagination.dto';
import { Transaction } from '../entities/transaction.entity';
import { TransactionType } from '../enums/transaction-type.enum';

const PROVIDER_CREDIT_TYPES = [TransactionType.PROVIDER_EARNING, TransactionType.PROVIDER_FORFEIT_CREDIT];

interface Cursor {
  createdAt: string;
  id: string;
}

function encodeCursor(tx: Transaction): string {
  return Buffer.from(JSON.stringify({ createdAt: tx.createdAt.toISOString(), id: tx.id })).toString('base64');
}

function decodeCursor(cursor: string): Cursor {
  return JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'));
}

/** Cursor-paginated search mirrors BookingRepository.search's exact shape and reasoning (no offset pagination — see its doc comment). */
@Injectable()
export class TransactionRepository extends BaseRepository<Transaction> {
  constructor(@InjectRepository(Transaction) repository: Repository<Transaction>) {
    super(repository);
  }

  async search(params: {
    type?: TransactionType;
    bookingId?: string;
    providerId?: string;
    from?: Date;
    to?: Date;
    cursor?: string;
    limit?: number;
  }): Promise<CursorPage<Transaction>> {
    const qb = this.repository.createQueryBuilder('t');

    if (params.type) {
      qb.andWhere('t.type = :type', { type: params.type });
    }
    if (params.bookingId) {
      qb.andWhere('t.bookingId = :bookingId', { bookingId: params.bookingId });
    }
    if (params.providerId) {
      qb.andWhere('t.providerId = :providerId', { providerId: params.providerId });
    }
    if (params.from) {
      qb.andWhere('t.createdAt >= :from', { from: params.from });
    }
    if (params.to) {
      qb.andWhere('t.createdAt <= :to', { to: params.to });
    }

    qb.orderBy('t.createdAt', 'DESC').addOrderBy('t.id', 'DESC');

    if (params.cursor) {
      const { createdAt, id } = decodeCursor(params.cursor);
      qb.andWhere('(t.createdAt, t.id) < (:cAt, :cId)', { cAt: createdAt, cId: id });
    }

    const limit = params.limit ?? 20;
    const rows = await qb.take(limit + 1).getMany();
    const hasMore = rows.length > limit;
    const data = hasMore ? rows.slice(0, limit) : rows;

    return {
      data,
      meta: { hasMore, nextCursor: hasMore ? encodeCursor(data[data.length - 1]) : null },
    };
  }

  /** The Wallets view's balance column — unsettled provider credits, excluding whatever's already attached to a Settlement. */
  async sumUnsettledForProvider(providerId: string): Promise<number> {
    const row = await this.repository
      .createQueryBuilder('t')
      .select('COALESCE(SUM(t.amountMinor), 0)', 'total')
      .where('t.providerId = :providerId', { providerId })
      .andWhere('t.settlementId IS NULL')
      .andWhere('t.type IN (:...types)', { types: PROVIDER_CREDIT_TYPES })
      .getRawOne<{ total: string }>();
    return Number(row?.total ?? 0);
  }

  /** Lifetime earned, settled or not — the Wallets drawer's "all time" figure. */
  async sumLifetimeEarnedForProvider(providerId: string): Promise<number> {
    const row = await this.repository
      .createQueryBuilder('t')
      .select('COALESCE(SUM(t.amountMinor), 0)', 'total')
      .where('t.providerId = :providerId', { providerId })
      .andWhere('t.type IN (:...types)', { types: PROVIDER_CREDIT_TYPES })
      .getRawOne<{ total: string }>();
    return Number(row?.total ?? 0);
  }

  /** Every provider who has ever earned anything — the Wallets list's row set. */
  async listProviderIdsWithActivity(): Promise<string[]> {
    const rows = await this.repository
      .createQueryBuilder('t')
      .select('DISTINCT t.providerId', 'providerId')
      .where('t.providerId IS NOT NULL')
      .andWhere('t.type IN (:...types)', { types: PROVIDER_CREDIT_TYPES })
      .getRawMany<{ providerId: string }>();
    return rows.map((r) => r.providerId);
  }
}
