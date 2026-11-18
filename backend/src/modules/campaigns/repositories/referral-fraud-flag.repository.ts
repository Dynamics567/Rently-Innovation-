import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { BaseRepository } from '@common/base/base.repository';
import { CursorPage } from '@common/dto/cursor-pagination.dto';
import { ReferralFraudFlag } from '../entities/referral-fraud-flag.entity';

interface Cursor {
  createdAt: string;
  id: string;
}

function encodeCursor(row: ReferralFraudFlag): string {
  return Buffer.from(
    JSON.stringify({ createdAt: row.createdAt.toISOString(), id: row.id }),
  ).toString('base64');
}

function decodeCursor(cursor: string): Cursor {
  return JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'));
}

@Injectable()
export class ReferralFraudFlagRepository extends BaseRepository<ReferralFraudFlag> {
  constructor(@InjectRepository(ReferralFraudFlag) repository: Repository<ReferralFraudFlag>) {
    super(repository);
  }

  /** `openOnly` is the default admin view — once acknowledged, a flag drops out unless explicitly asked for. */
  async search(
    openOnly: boolean,
    cursor?: string,
    limit = 20,
  ): Promise<CursorPage<ReferralFraudFlag>> {
    const qb = this.repository.createQueryBuilder('flag');
    if (openOnly) {
      qb.andWhere('flag.acknowledgedAt IS NULL');
    }
    qb.orderBy('flag.createdAt', 'DESC').addOrderBy('flag.id', 'DESC');
    if (cursor) {
      const { createdAt, id } = decodeCursor(cursor);
      qb.andWhere('(flag.createdAt, flag.id) < (:cAt, :cId)', { cAt: createdAt, cId: id });
    }
    const rows = await qb.take(limit + 1).getMany();
    const hasMore = rows.length > limit;
    const data = hasMore ? rows.slice(0, limit) : rows;
    return {
      data,
      meta: { hasMore, nextCursor: hasMore ? encodeCursor(data[data.length - 1]) : null },
    };
  }

  async countOpen(): Promise<number> {
    return this.repository.count({ where: { acknowledgedAt: IsNull() } });
  }
}
