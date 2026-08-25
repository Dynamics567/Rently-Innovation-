import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from '@common/base/base.repository';
import { CursorPage } from '@common/dto/cursor-pagination.dto';
import { Booking } from '../entities/booking.entity';
import { BookingStatus } from '../enums/booking.enums';

interface Cursor {
  createdAt: string;
  id: string;
}

function encodeCursor(booking: Booking): string {
  return Buffer.from(
    JSON.stringify({ createdAt: booking.createdAt.toISOString(), id: booking.id }),
  ).toString('base64');
}

function decodeCursor(cursor: string): Cursor {
  return JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'));
}

@Injectable()
export class BookingRepository extends BaseRepository<Booking> {
  constructor(@InjectRepository(Booking) repository: Repository<Booking>) {
    super(repository);
  }

  async findByIdempotencyKey(key: string): Promise<Booking | null> {
    return this.repository.findOne({ where: { idempotencyKey: key } });
  }

  /**
   * Does any existing pending/confirmed booking on this listing overlap
   * `[from, to)` once padded by `bufferMinutes` on both sides? This is an
   * application-level guard layered on top of the `no_overlapping_bookings`
   * EXCLUDE constraint (which has zero awareness of buffer minutes and
   * remains the only true race-proof guarantee) — same accepted-gap
   * reasoning as the availability-block check in AvailabilityService.
   */
  async hasOverlapWithBuffer(
    listingId: string,
    from: Date,
    to: Date,
    bufferMinutes: number,
    excludeBookingId?: string,
  ): Promise<boolean> {
    const qb = this.repository
      .createQueryBuilder('booking')
      .where('booking.listingId = :listingId', { listingId })
      .andWhere("booking.status IN ('pending','confirmed')")
      .andWhere(
        "booking.during && tstzrange(:from::timestamptz - (:buffer || ' minutes')::interval, :to::timestamptz + (:buffer || ' minutes')::interval)",
        { from: from.toISOString(), to: to.toISOString(), buffer: bufferMinutes },
      );
    if (excludeBookingId) {
      qb.andWhere('booking.id != :excludeBookingId', { excludeBookingId });
    }
    const count = await qb.getCount();
    return count > 0;
  }

  /** Same as hasOverlapWithBuffer, scoped to one specific asset rather than the whole listing — for multi-asset listings, where other assets' bookings must not block this one. */
  async hasOverlapForAssetWithBuffer(
    assetId: string,
    from: Date,
    to: Date,
    bufferMinutes: number,
    excludeBookingId?: string,
  ): Promise<boolean> {
    const qb = this.repository
      .createQueryBuilder('booking')
      .where('booking.assetId = :assetId', { assetId })
      .andWhere("booking.status IN ('pending','confirmed')")
      .andWhere(
        "booking.during && tstzrange(:from::timestamptz - (:buffer || ' minutes')::interval, :to::timestamptz + (:buffer || ' minutes')::interval)",
        { from: from.toISOString(), to: to.toISOString(), buffer: bufferMinutes },
      );
    if (excludeBookingId) {
      qb.andWhere('booking.id != :excludeBookingId', { excludeBookingId });
    }
    const count = await qb.getCount();
    return count > 0;
  }

  /**
   * `role` picks which column to filter by: a renter sees bookings they
   * made, a provider sees bookings against their listings. `listingIds` is
   * supplied by the caller (resolved via CatalogService — Booking doesn't
   * query Catalog's tables directly) when role is 'provider'.
   */
  async search(params: {
    role: 'renter' | 'provider';
    renterId?: string;
    listingIds?: string[];
    status?: BookingStatus;
    cursor?: string;
    limit?: number;
  }): Promise<CursorPage<Booking>> {
    const qb = this.repository.createQueryBuilder('booking');

    if (params.role === 'renter') {
      qb.where('booking.renterId = :renterId', { renterId: params.renterId });
    } else {
      qb.where('booking.listingId IN (:...listingIds)', {
        listingIds: params.listingIds?.length ? params.listingIds : [null],
      });
    }

    if (params.status) {
      qb.andWhere('booking.status = :status', { status: params.status });
    }

    qb.orderBy('booking.createdAt', 'DESC').addOrderBy('booking.id', 'DESC');

    if (params.cursor) {
      const { createdAt, id } = decodeCursor(params.cursor);
      qb.andWhere('(booking.createdAt, booking.id) < (:cAt, :cId)', { cAt: createdAt, cId: id });
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
