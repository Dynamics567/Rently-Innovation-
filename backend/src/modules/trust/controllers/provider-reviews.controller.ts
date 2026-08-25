import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '@common/decorators/public.decorator';
import { CursorPaginationDto } from '@common/dto/cursor-pagination.dto';
import { ProviderProfileService } from '@modules/identity/services/provider-profile.service';
import { ReviewsService } from '../services/reviews.service';

@ApiTags('reviews')
@Controller('providers/:providerId/reviews')
export class ProviderReviewsController {
  constructor(
    private readonly reviewsService: ReviewsService,
    private readonly providerProfileService: ProviderProfileService,
  ) {}

  @Public()
  @Get()
  async list(@Param('providerId', ParseUUIDPipe) providerId: string, @Query() query: CursorPaginationDto) {
    const profile = await this.providerProfileService.getById(providerId);
    return this.reviewsService.listForProviderTarget(profile.userId, query);
  }
}
