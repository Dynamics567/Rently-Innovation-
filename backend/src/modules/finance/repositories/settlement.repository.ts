import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from '@common/base/base.repository';
import { CursorPage } from '@common/dto/cursor-pagination.dto';
import { Settlement } from '../entities/settlement.entity';

interface Cursor {
  createdAt: string;
  id: string;
}

function encodeCursor(s: Settlement): string {
  return Buffer.from(JSON.stringify({ createdAt: s.createdAt.toISOString(), id: s.id })).toString('base64');
}

function decodeCursor(cursor: string): Cursor {
  return JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'));
}

@Injectable()
export class SettlementRepository extends BaseRepository<Settlement> {
  constructor(@InjectRepository(Settlement) repository: Repository<Settlement>) {
    super(repository);
  }

  async search(params: { providerId?: string; cursor?: string; limit?: number }): Promise<CursorPage<Settlement>> {
    const qb = this.repository.createQueryBuilder('s');
    if (params.providerId) {
      qb.andWhere('s.providerId = :providerId', { providerId: params.providerId });
    }
    qb.orderBy('s.createdAt', 'DESC').addOrderBy('s.id', 'DESC');
    if (params.cursor) {
      const { createdAt, id } = decodeCursor(params.cursor);
      qb.andWhere('(s.createdAt, s.id) < (:cAt, :cId)', { cAt: createdAt, cId: id });
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

  /** The Wallets list's "last settlement" column. */
  async findLatestForProvider(providerId: string): Promise<Settlement | null> {
    return this.repository.findOne({ where: { providerId }, order: { createdAt: 'DESC' } });
  }
}
