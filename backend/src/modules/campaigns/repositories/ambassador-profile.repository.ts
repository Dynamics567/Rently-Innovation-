import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from '@common/base/base.repository';
import { CursorPage } from '@common/dto/cursor-pagination.dto';
import { AmbassadorProfile } from '../entities/ambassador-profile.entity';

interface Cursor {
  createdAt: string;
  id: string;
}

function encodeCursor(row: AmbassadorProfile): string {
  return Buffer.from(
    JSON.stringify({ createdAt: row.createdAt.toISOString(), id: row.id }),
  ).toString('base64');
}

function decodeCursor(cursor: string): Cursor {
  return JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'));
}

@Injectable()
export class AmbassadorProfileRepository extends BaseRepository<AmbassadorProfile> {
  constructor(@InjectRepository(AmbassadorProfile) repository: Repository<AmbassadorProfile>) {
    super(repository);
  }

  async findByUserId(userId: string): Promise<AmbassadorProfile | null> {
    return this.repository.findOne({ where: { userId } });
  }

  async findByReferralCode(referralCode: string): Promise<AmbassadorProfile | null> {
    return this.repository.findOne({ where: { referralCode } });
  }

  /** Same cursor shape as ProviderProfileRepository.searchForAdmin — no joined user table here, admin UI resolves names separately. */
  async search(cursor?: string, limit = 20): Promise<CursorPage<AmbassadorProfile>> {
    const qb = this.repository.createQueryBuilder('ambassador');
    qb.orderBy('ambassador.createdAt', 'DESC').addOrderBy('ambassador.id', 'DESC');
    if (cursor) {
      const { createdAt, id } = decodeCursor(cursor);
      qb.andWhere('(ambassador.createdAt, ambassador.id) < (:cAt, :cId)', {
        cAt: createdAt,
        cId: id,
      });
    }
    const rows = await qb.take(limit + 1).getMany();
    const hasMore = rows.length > limit;
    const data = hasMore ? rows.slice(0, limit) : rows;
    return {
      data,
      meta: { hasMore, nextCursor: hasMore ? encodeCursor(data[data.length - 1]) : null },
    };
  }

  /** CSV export (Phase 7) — capped, not cursor-paginated like search(); an export is one download, not a browsing session. */
  async listAllForExport(limit = 2000): Promise<AmbassadorProfile[]> {
    return this.repository.find({ order: { createdAt: 'DESC' }, take: limit });
  }
}
