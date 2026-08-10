import { Injectable } from '@nestjs/common';
import { toTstzRangeLiteral } from '@common/utils/tstzrange.util';
import { AvailabilityBlockRepository } from '../repositories/availability-block.repository';
import { AvailabilityBlock } from '../entities/availability-block.entity';

/**
 * Owns provider-set manual availability blocks (maintenance, personal use)
 * only. Confirmed-booking-driven blocks live in BookingModule and are
 * enforced there by the `no_overlapping_bookings` EXCLUDE constraint —
 * Catalog deliberately does not import BookingModule to read them (would
 * create a circular module dependency, since Booking already depends on
 * Catalog for listing data). A consumer that needs "manual blocks + booked
 * ranges" merged currently composes both reads client-side; unifying them
 * server-side is a follow-up once a cross-module read model exists.
 */
@Injectable()
export class AvailabilityService {
  constructor(private readonly blockRepository: AvailabilityBlockRepository) {}

  async getBlocksInRange(listingId: string, from: Date, to: Date): Promise<AvailabilityBlock[]> {
    return this.blockRepository.findByListingInRange(listingId, from, to);
  }

  async createBlock(
    listingId: string,
    from: Date,
    to: Date,
    reason?: string,
  ): Promise<AvailabilityBlock> {
    const block = this.blockRepository.create({
      listingId,
      during: toTstzRangeLiteral(from, to),
      startsAt: from,
      endsAt: to,
      reason: reason ?? null,
    });
    return this.blockRepository.save(block);
  }

  async isBlocked(listingId: string, from: Date, to: Date): Promise<boolean> {
    return this.blockRepository.hasOverlap(listingId, from, to);
  }
}
