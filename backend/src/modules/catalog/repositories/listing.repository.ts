import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from '@common/base/base.repository';
import { CursorPage } from '@common/dto/cursor-pagination.dto';
import { Listing } from '../entities/listing.entity';
import { ListingStatus } from '../enums/listing.enums';
import { QueryListingsDto } from '../dto/query-listings.dto';

interface Cursor {
  sortValue: string;
  id: string;
}

interface SortSpec {
  column: string;
  direction: 'ASC' | 'DESC';
  cursorValue: (listing: Listing) => string;
}

// Cursor comparison must key off the SAME column the query is ordered by —
// keying every sort variant off `createdAt` (the previous implementation)
// silently broke pagination for price/rating sorts, since page 2 would then
// be filtered by a column the results weren't ordered by.
const SORTS: Record<string, SortSpec> = {
  price_asc: {
    column: 'listing.priceMinor',
    direction: 'ASC',
    cursorValue: (l) => String(l.priceMinor),
  },
  price_desc: {
    column: 'listing.priceMinor',
    direction: 'DESC',
    cursorValue: (l) => String(l.priceMinor),
  },
  rating: {
    column: 'listing.avgRating',
    direction: 'DESC',
    cursorValue: (l) => String(l.avgRating),
  },
  recommended: {
    column: 'listing.createdAt',
    direction: 'DESC',
    cursorValue: (l) => l.createdAt.toISOString(),
  },
};

function encodeCursor(spec: SortSpec, listing: Listing): string {
  return Buffer.from(
    JSON.stringify({ sortValue: spec.cursorValue(listing), id: listing.id }),
  ).toString('base64');
}

function decodeCursor(cursor: string): Cursor {
  return JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'));
}

@Injectable()
export class ListingRepository extends BaseRepository<Listing> {
  constructor(@InjectRepository(Listing) repository: Repository<Listing>) {
    super(repository);
  }

  /**
   * Cursor-paginated search over Postgres directly (ILIKE + indexed filters).
   * Stands in for the OpenSearch-backed `/search` in docs/API_DESIGN.md until
   * listing volume justifies the extraction — see ARCHITECTURE.md §5 Stage 2.
   */
  async search(dto: QueryListingsDto, statuses: ListingStatus[]): Promise<CursorPage<Listing>> {
    const spec = SORTS[dto.sort ?? 'recommended'];

    const qb = this.repository
      .createQueryBuilder('listing')
      .leftJoinAndSelect('listing.category', 'category')
      .where('listing.status IN (:...statuses)', { statuses });

    if (dto.category) {
      qb.andWhere('category.slug = :slug', { slug: dto.category });
    }
    if (dto.providerId) {
      qb.andWhere('listing.providerId = :providerId', { providerId: dto.providerId });
    }
    if (dto.q) {
      qb.andWhere(
        '(listing.title ILIKE :q OR listing.description ILIKE :q OR listing.locationText ILIKE :q)',
        {
          q: `%${dto.q}%`,
        },
      );
    }
    if (dto.priceMin !== undefined) {
      qb.andWhere('listing.priceMinor >= :priceMin', { priceMin: dto.priceMin });
    }
    if (dto.priceMax !== undefined) {
      qb.andWhere('listing.priceMinor <= :priceMax', { priceMax: dto.priceMax });
    }
    if (dto.instantOnly) {
      qb.andWhere("listing.bookingMode = 'instant'");
    }
    if (dto.ratingMin !== undefined) {
      qb.andWhere('listing.avgRating >= :ratingMin', { ratingMin: dto.ratingMin });
    }

    qb.orderBy(spec.column, spec.direction).addOrderBy('listing.id', spec.direction);

    if (dto.cursor) {
      const { sortValue, id } = decodeCursor(dto.cursor);
      const op = spec.direction === 'DESC' ? '<' : '>';
      qb.andWhere(`(${spec.column}, listing.id) ${op} (:cVal, :cId)`, { cVal: sortValue, cId: id });
    }

    const limit = dto.limit ?? 20;
    const rows = await qb.take(limit + 1).getMany();
    const hasMore = rows.length > limit;
    const data = hasMore ? rows.slice(0, limit) : rows;

    return {
      data,
      meta: {
        hasMore,
        nextCursor: hasMore ? encodeCursor(spec, data[data.length - 1]) : null,
      },
    };
  }

  /** Backs GET /admin/listings/moderation-queue — unscoped by provider, unlike search()/searchOwn(). */
  async findPendingReview(): Promise<Listing[]> {
    return this.repository.find({
      where: { status: ListingStatus.PENDING_REVIEW },
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * [Overview histogram] Price spread across live listings, bucketed into
   * fixed ₦ ranges. Scoped to LIVE only — a draft/rejected listing's price
   * isn't a real market data point yet. Buckets are returned pre-ordered
   * (the CASE index), not alphabetically, so "Under ₦10k" never sorts
   * after "₦50k–100k".
   */
  async getPriceDistribution(): Promise<{ bucket: string; count: number }[]> {
    const bucketExpr = `
      CASE
        WHEN listing.priceMinor < 1000000 THEN 0
        WHEN listing.priceMinor < 2500000 THEN 1
        WHEN listing.priceMinor < 5000000 THEN 2
        WHEN listing.priceMinor < 10000000 THEN 3
        WHEN listing.priceMinor < 25000000 THEN 4
        ELSE 5
      END
    `;
    const rows = await this.repository
      .createQueryBuilder('listing')
      .select(bucketExpr, 'bucket_index')
      .addSelect('COUNT(*)', 'count')
      .where('listing.status = :status', { status: ListingStatus.LIVE })
      .groupBy(bucketExpr)
      .orderBy('bucket_index', 'ASC')
      .getRawMany<{ bucket_index: string; count: string }>();
    const labels = ['Under ₦10k', '₦10k–25k', '₦25k–50k', '₦50k–100k', '₦100k–250k', '₦250k+'];
    return rows.map((r) => ({ bucket: labels[Number(r.bucket_index)], count: Number(r.count) }));
  }
}
