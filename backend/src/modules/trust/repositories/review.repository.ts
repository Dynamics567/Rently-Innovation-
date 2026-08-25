import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from '@common/base/base.repository';
import { CursorPage } from '@common/dto/cursor-pagination.dto';
import { Review } from '../entities/review.entity';
import { ReviewDirection } from '../enums/review-direction.enum';

interface Cursor {
  createdAt: string;
  id: string;
}

function encodeCursor(row: Review): string {
  return Buffer.from(JSON.stringify({ createdAt: row.createdAt.toISOString(), id: row.id })).toString(
    'base64',
  );
}

function decodeCursor(cursor: string): Cursor {
  return JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'));
}

@Injectable()
export class ReviewRepository extends BaseRepository<Review> {
  constructor(@InjectRepository(Review) repository: Repository<Review>) {
    super(repository);
  }

  async findByBookingAndDirection(
    bookingId: string,
    direction: ReviewDirection,
  ): Promise<Review | null> {
    return this.repository.findOne({ where: { bookingId, direction } });
  }

  async getAggregateForListing(listingId: string): Promise<{ avgRating: number; count: number }> {
    const row = await this.repository
      .createQueryBuilder('r')
      .select('AVG(r.rating)', 'avg')
      .addSelect('COUNT(*)', 'count')
      .where('r.listingId = :listingId', { listingId })
      .andWhere('r.direction = :direction', { direction: ReviewDirection.RENTER_TO_PROVIDER })
      .getRawOne<{ avg: string | null; count: string }>();
    return { avgRating: row?.avg ? Number(row.avg) : 0, count: row ? Number(row.count) : 0 };
  }

  async getAggregateForProviderTarget(targetId: string): Promise<{ avgRating: number; count: number }> {
    const row = await this.repository
      .createQueryBuilder('r')
      .select('AVG(r.rating)', 'avg')
      .addSelect('COUNT(*)', 'count')
      .where('r.targetId = :targetId', { targetId })
      .andWhere('r.direction = :direction', { direction: ReviewDirection.RENTER_TO_PROVIDER })
      .getRawOne<{ avg: string | null; count: string }>();
    return { avgRating: row?.avg ? Number(row.avg) : 0, count: row ? Number(row.count) : 0 };
  }

  async searchForListing(
    listingId: string,
    params: { cursor?: string; limit?: number },
  ): Promise<CursorPage<Review>> {
    return this.searchBy(
      (qb) =>
        qb
          .where('r.listingId = :listingId', { listingId })
          .andWhere('r.direction = :direction', { direction: ReviewDirection.RENTER_TO_PROVIDER }),
      params,
    );
  }

  async searchForProviderTarget(
    targetId: string,
    params: { cursor?: string; limit?: number },
  ): Promise<CursorPage<Review>> {
    return this.searchBy(
      (qb) =>
        qb
          .where('r.targetId = :targetId', { targetId })
          .andWhere('r.direction = :direction', { direction: ReviewDirection.RENTER_TO_PROVIDER }),
      params,
    );
  }

  private async searchBy(
    applyWhere: (qb: ReturnType<Repository<Review>['createQueryBuilder']>) => void,
    params: { cursor?: string; limit?: number },
  ): Promise<CursorPage<Review>> {
    const qb = this.repository.createQueryBuilder('r');
    applyWhere(qb);
    qb.orderBy('r.createdAt', 'DESC').addOrderBy('r.id', 'DESC');

    if (params.cursor) {
      const { createdAt, id } = decodeCursor(params.cursor);
      qb.andWhere('(r.createdAt, r.id) < (:cAt, :cId)', { cAt: createdAt, cId: id });
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
}
