import { Body, Controller, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CheckPolicies } from '@common/decorators/check-policies.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AuthenticatedUser } from '@modules/identity/strategies/jwt.strategy';
import { ReviewsService } from '../services/reviews.service';
import { CreateReviewDto } from '../dto/create-review.dto';
import { IsReviewBookingPartyPolicy } from '../policies/is-review-booking-party.policy';

@ApiTags('reviews')
@ApiBearerAuth()
@Controller('bookings/:bookingId/reviews')
export class BookingReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @CheckPolicies(IsReviewBookingPartyPolicy)
  @Post()
  async submit(
    @Param('bookingId', ParseUUIDPipe) bookingId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewsService.submit(bookingId, user.id, dto);
  }
}
