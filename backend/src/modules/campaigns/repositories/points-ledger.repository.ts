import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from '@common/base/base.repository';
import { CursorPage } from '@common/dto/cursor-pagination.dto';
import { PointsLedgerEntry } from '../entities/points-ledger-entry.entity';

interface Cursor {
  createdAt: string;
  id: string;
}

function encodeCursor(row: PointsLedgerEntry): string {
  return Buffer.from(
    JSON.stringify({ createdAt: row.createdAt.toISOString(), id: row.id }),
  ).toString('base64');
}

function decodeCursor(cursor: string): Cursor {
  return JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'));
}

export interface LeaderboardRow {
  ambassadorId: string;
  userId: string;
  status: string;
  referralCode: string;
  balance: number;
  reachedAt: string | null;
}

@Injectable()
export class PointsLedgerRepository extends BaseRepository<PointsLedgerEntry> {
  constructor(@InjectRepository(PointsLedgerEntry) repository: Repository<PointsLedgerEntry>) {
    super(repository);
  }

  async getBalance(ambassadorId: string): Promise<number> {
    const { sum } = await this.repository
      .createQueryBuilder('p')
      .select('COALESCE(SUM(p.pointsDelta), 0)', 'sum')
      .where('p.ambassadorId = :ambassadorId', { ambassadorId })
      .getRawOne();
    return Number(sum);
  }

  /** Batch balances for a list view — one grouped query, never one per row. */
  async getBalances(ambassadorIds: string[]): Promise<Map<string, number>> {
    if (!ambassadorIds.length) return new Map();
    const rows = await this.repository
      .createQueryBuilder('p')
      .select('p.ambassadorId', 'ambassadorId')
      .addSelect('COALESCE(SUM(p.pointsDelta), 0)', 'balance')
      .where('p.ambassadorId IN (:...ambassadorIds)', { ambassadorIds })
      .groupBy('p.ambassadorId')
      .getRawMany();
    return new Map(rows.map((r) => [r.ambassadorId, Number(r.balance)]));
  }

  async findByAmbassadorId(
    ambassadorId: string,
    cursor?: string,
    limit = 20,
  ): Promise<CursorPage<PointsLedgerEntry>> {
    const qb = this.repository
      .createQueryBuilder('p')
      .andWhere('p.ambassadorId = :ambassadorId', { ambassadorId });
    qb.orderBy('p.createdAt', 'DESC').addOrderBy('p.id', 'DESC');
    if (cursor) {
      const { createdAt, id } = decodeCursor(cursor);
      qb.andWhere('(p.createdAt, p.id) < (:cAt, :cId)', { cAt: createdAt, cId: id });
    }
    const rows = await qb.take(limit + 1).getMany();
    const hasMore = rows.length > limit;
    const data = hasMore ? rows.slice(0, limit) : rows;
    return {
      data,
      meta: { hasMore, nextCursor: hasMore ? encodeCursor(data[data.length - 1]) : null },
    };
  }

  /**
   * Brief §9's official tie-break rule: "where participants have the same
   * final score, the participant who first achieved that final score
   * wins." `reachedAt` is computed from ledger history via a window
   * function — the earliest point at which an ambassador's running
   * cumulative total first equalled their eventual final balance — never
   * a separately stored timestamp that could drift from the real history.
   * Every approved/active ambassador appears even at a zero balance (LEFT
   * JOIN), so the board reflects the full roster, not just those with
   * ledger activity. Raw SQL — a correlated window-function CTE isn't
   * expressible through TypeORM's query builder.
   */
  async getLeaderboard(limit = 50): Promise<LeaderboardRow[]> {
    return this.repository.manager.query(
      `
      WITH balances AS (
        SELECT ambassador_id, COALESCE(SUM(points_delta), 0) AS balance
        FROM points_ledger_entries
        GROUP BY ambassador_id
      ),
      running AS (
        SELECT ambassador_id, created_at,
          SUM(points_delta) OVER (PARTITION BY ambassador_id ORDER BY created_at, id) AS running_total
        FROM points_ledger_entries
      ),
      first_reach AS (
        SELECT r.ambassador_id, MIN(r.created_at) AS reached_at
        FROM running r
        JOIN balances b ON b.ambassador_id = r.ambassador_id
        WHERE r.running_total = b.balance
        GROUP BY r.ambassador_id
      )
      SELECT ap.id AS "ambassadorId", ap.user_id AS "userId", ap.status, ap.referral_code AS "referralCode",
             COALESCE(b.balance, 0)::int AS balance, fr.reached_at AS "reachedAt"
      FROM ambassador_profiles ap
      LEFT JOIN balances b ON b.ambassador_id = ap.id
      LEFT JOIN first_reach fr ON fr.ambassador_id = ap.id
      WHERE ap.deleted_at IS NULL AND ap.status IN ('approved', 'active')
      ORDER BY COALESCE(b.balance, 0) DESC, fr.reached_at ASC NULLS LAST
      LIMIT $1
      `,
      [limit],
    );
  }

  /**
   * One ambassador's own standing — same ranking rule as getLeaderboard()
   * (verified balance, official tie-break), scoped to a single row via
   * RANK() rather than materializing and slicing the whole board. Null
   * when the ambassador isn't approved/active, i.e. not on the board at all.
   */
  async getRank(ambassadorId: string): Promise<{ rank: number; totalParticipants: number } | null> {
    const rows: Array<{ rank: number; totalParticipants: number }> =
      await this.repository.manager.query(
        `
      WITH balances AS (
        SELECT ambassador_id, COALESCE(SUM(points_delta), 0) AS balance
        FROM points_ledger_entries
        GROUP BY ambassador_id
      ),
      running AS (
        SELECT ambassador_id, created_at,
          SUM(points_delta) OVER (PARTITION BY ambassador_id ORDER BY created_at, id) AS running_total
        FROM points_ledger_entries
      ),
      first_reach AS (
        SELECT r.ambassador_id, MIN(r.created_at) AS reached_at
        FROM running r
        JOIN balances b ON b.ambassador_id = r.ambassador_id
        WHERE r.running_total = b.balance
        GROUP BY r.ambassador_id
      ),
      ranked AS (
        SELECT ap.id AS ambassador_id,
          RANK() OVER (ORDER BY COALESCE(b.balance, 0) DESC, fr.reached_at ASC NULLS LAST) AS rank
        FROM ambassador_profiles ap
        LEFT JOIN balances b ON b.ambassador_id = ap.id
        LEFT JOIN first_reach fr ON fr.ambassador_id = ap.id
        WHERE ap.deleted_at IS NULL AND ap.status IN ('approved', 'active')
      )
      SELECT rank::int AS rank, (SELECT COUNT(*) FROM ranked)::int AS "totalParticipants"
      FROM ranked
      WHERE ambassador_id = $1
      `,
        [ambassadorId],
      );
    return rows[0] ?? null;
  }

  /** CSV export (Phase 7) — every ambassador's ledger, newest first, capped so one export can never pull the whole table unbounded. */
  async listAllForExport(limit = 5000): Promise<PointsLedgerEntry[]> {
    return this.repository.find({ order: { createdAt: 'DESC' }, take: limit });
  }
}
