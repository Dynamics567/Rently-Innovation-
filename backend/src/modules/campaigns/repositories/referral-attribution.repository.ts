import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from '@common/base/base.repository';
import { CursorPage } from '@common/dto/cursor-pagination.dto';
import { ReferralAttribution } from '../entities/referral-attribution.entity';

interface Cursor {
  createdAt: string;
  id: string;
}

function encodeCursor(row: ReferralAttribution): string {
  return Buffer.from(JSON.stringify({ createdAt: row.createdAt.toISOString(), id: row.id })).toString('base64');
}

function decodeCursor(cursor: string): Cursor {
  return JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'));
}

@Injectable()
export class ReferralAttributionRepository extends BaseRepository<ReferralAttribution> {
  constructor(@InjectRepository(ReferralAttribution) repository: Repository<ReferralAttribution>) {
    super(repository);
  }

  /** Backs the DB-level half of "one ambassador per referred user" — the unique index is the real guarantee, this is just the pre-check for a clean error. */
  async findByReferredUserId(referredUserId: string): Promise<ReferralAttribution | null> {
    return this.repository.findOne({ where: { referredUserId } });
  }

  /** Dashboard summary tile (admin and self-service "me/summary" alike) — one grouped query, never a count-per-status round trip. */
  async countsByAmbassador(ambassadorId: string): Promise<Record<string, number>> {
    const rows = await this.repository
      .createQueryBuilder('referral')
      .select('referral.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('referral.ambassadorId = :ambassadorId', { ambassadorId })
      .groupBy('referral.status')
      .getRawMany();
    return Object.fromEntries(rows.map((r) => [r.status, Number(r.count)]));
  }

  /** [Admin] Referrals view, optionally scoped to one ambassador (their own "my referrals" list reuses this with ambassadorId set). */
  async search(ambassadorId?: string, cursor?: string, limit = 20): Promise<CursorPage<ReferralAttribution>> {
    const qb = this.repository.createQueryBuilder('referral');
    if (ambassadorId) {
      qb.andWhere('referral.ambassadorId = :ambassadorId', { ambassadorId });
    }
    qb.orderBy('referral.createdAt', 'DESC').addOrderBy('referral.id', 'DESC');
    if (cursor) {
      const { createdAt, id } = decodeCursor(cursor);
      qb.andWhere('(referral.createdAt, referral.id) < (:cAt, :cId)', { cAt: createdAt, cId: id });
    }
    const rows = await qb.take(limit + 1).getMany();
    const hasMore = rows.length > limit;
    const data = hasMore ? rows.slice(0, limit) : rows;
    return { data, meta: { hasMore, nextCursor: hasMore ? encodeCursor(data[data.length - 1]) : null } };
  }
}
