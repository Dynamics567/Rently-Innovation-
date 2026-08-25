import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IdentityModule } from '@modules/identity/identity.module';
import { CatalogModule } from '@modules/catalog/catalog.module';
import { BookingModule } from '@modules/booking/booking.module';
import { Review } from './entities/review.entity';
import { ReviewRepository } from './repositories/review.repository';
import { ReviewsService } from './services/reviews.service';
import { BookingReviewsController } from './controllers/booking-reviews.controller';
import { ListingReviewsController } from './controllers/listing-reviews.controller';
import { ProviderReviewsController } from './controllers/provider-reviews.controller';
import { ReviewsController } from './controllers/reviews.controller';

/**
 * One-directional: reads Booking (to confirm completion + resolve parties),
 * writes onto Catalog's Listing and Identity's ProviderProfile through
 * their own exported recomputeRatingAggregate() methods — never imports
 * either entity directly. Booking/Catalog never import Trust back, so no
 * module cycle (unlike disputes, which stay inside BookingModule itself for
 * exactly this reason).
 */
@Module({
  imports: [TypeOrmModule.forFeature([Review]), IdentityModule, CatalogModule, BookingModule],
  controllers: [
    BookingReviewsController,
    ListingReviewsController,
    ProviderReviewsController,
    ReviewsController,
  ],
  providers: [ReviewRepository, ReviewsService],
  exports: [ReviewsService],
})
export class TrustModule {}
