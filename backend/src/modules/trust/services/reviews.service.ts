import { Injectable } from '@nestjs/common';
import { DomainException } from '@common/errors/domain.exception';
import { ErrorCode } from '@common/errors/error-codes.enum';
import { CursorPage } from '@common/dto/cursor-pagination.dto';
import { BookingService } from '@modules/booking/services/booking.service';
import { BookingStatus } from '@modules/booking/enums/booking.enums';
import { ListingsService } from '@modules/catalog/services/listings.service';
import { ProviderProfileService } from '@modules/identity/services/provider-profile.service';
import { Review } from '../entities/review.entity';
import { ReviewRepository } from '../repositories/review.repository';
import { ReviewDirection } from '../enums/review-direction.enum';
import { CreateReviewDto } from '../dto/create-review.dto';

@Injectable()
export class ReviewsService {
  constructor(
    private readonly reviewRepository: ReviewRepository,
    private readonly bookingService: BookingService,
    private readonly listingsService: ListingsService,
    private readonly providerProfileService: ProviderProfileService,
  ) {}

  /**
   * Direction is inferred from who's asking, not passed in the body — a
   * renter reviewing "up" at the provider, or the provider reviewing "down"
   * at the renter. Only reachable once the booking has actually completed
   * (docs/DATABASE_SCHEMA.md's "review tied to a completed booking"), and
   * only once per direction per booking (DB-enforced unique index).
   */
  async submit(bookingId: string, authorUserId: string, dto: CreateReviewDto): Promise<Review> {
    const booking = await this.bookingService.findByIdOrFail(bookingId);
    if (booking.status !== BookingStatus.COMPLETED) {
      throw DomainException.conflict(
        ErrorCode.REVIEW_BOOKING_NOT_COMPLETED,
        'You can only leave a review after the rental is completed.',
      );
    }

    const listing = await this.listingsService.findByIdOrFail(booking.listingId);
    const providerProfile = await this.providerProfileService.getById(listing.providerId);

    let direction: ReviewDirection;
    let targetId: string;
    if (authorUserId === booking.renterId) {
      direction = ReviewDirection.RENTER_TO_PROVIDER;
      targetId = providerProfile.userId;
    } else if (authorUserId === providerProfile.userId) {
      direction = ReviewDirection.PROVIDER_TO_RENTER;
      targetId = booking.renterId;
    } else {
      throw DomainException.forbidden(ErrorCode.FORBIDDEN, "You weren't a party to this booking.");
    }

    const existing = await this.reviewRepository.findByBookingAndDirection(bookingId, direction);
    if (existing) {
      throw DomainException.conflict(
        ErrorCode.REVIEW_ALREADY_SUBMITTED,
        "You've already reviewed this booking.",
      );
    }

    const review = this.reviewRepository.create({
      bookingId,
      listingId: booking.listingId,
      authorId: authorUserId,
      targetId,
      direction,
      rating: dto.rating,
      comment: dto.comment ?? null,
    });
    const saved = await this.reviewRepository.save(review);

    // Only a renter->provider review feeds the public-facing rating
    // aggregates — there's no symmetric "renter's avgRating" field on User
    // for the other direction to update.
    if (direction === ReviewDirection.RENTER_TO_PROVIDER) {
      await this.recomputeAggregates(booking.listingId, providerProfile.id);
    }

    return saved;
  }

  async respondAsProvider(reviewId: string, providerUserId: string, response: string): Promise<Review> {
    const review = await this.reviewRepository.findByIdOrFail(reviewId, 'Review');
    if (review.direction !== ReviewDirection.RENTER_TO_PROVIDER || review.targetId !== providerUserId) {
      throw DomainException.forbidden(ErrorCode.FORBIDDEN, "You can't respond to this review.");
    }
    review.providerResponse = response;
    return this.reviewRepository.save(review);
  }

  async listForListing(listingId: string, pagination: { cursor?: string; limit?: number }) {
    return this.reviewRepository.searchForListing(listingId, pagination);
  }

  async listForProviderTarget(
    targetUserId: string,
    pagination: { cursor?: string; limit?: number },
  ): Promise<CursorPage<Review>> {
    return this.reviewRepository.searchForProviderTarget(targetUserId, pagination);
  }

  private async recomputeAggregates(listingId: string, providerProfileId: string): Promise<void> {
    const listingAgg = await this.reviewRepository.getAggregateForListing(listingId);
    await this.listingsService.recomputeRatingAggregate(listingId, listingAgg.avgRating, listingAgg.count);

    const profile = await this.providerProfileService.getById(providerProfileId);
    const providerAgg = await this.reviewRepository.getAggregateForProviderTarget(profile.userId);
    await this.providerProfileService.recomputeRatingAggregate(providerProfileId, providerAgg.avgRating);
  }
}
