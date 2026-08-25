import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '@common/decorators/public.decorator';
import { CursorPaginationDto } from '@common/dto/cursor-pagination.dto';
import { ReviewsService } from '../services/reviews.service';

@ApiTags('reviews')
@Controller('listings/:listingId/reviews')
export class ListingReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Public()
  @Get()
  async list(@Param('listingId', ParseUUIDPipe) listingId: string, @Query() query: CursorPaginationDto) {
    return this.reviewsService.listForListing(listingId, query);
  }
}
