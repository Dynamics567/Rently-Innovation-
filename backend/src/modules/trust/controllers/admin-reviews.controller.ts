import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';
import { CursorPaginationDto } from '@common/dto/cursor-pagination.dto';
import { Roles } from '@common/decorators/roles.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { UserRole } from '@modules/identity/enums/user-role.enum';
import { AuthenticatedUser } from '@modules/identity/strategies/jwt.strategy';
import { ReviewsService } from '../services/reviews.service';

class QueryAdminReviewsDto extends CursorPaginationDto {
  @ApiPropertyOptional({ description: 'Partial match against review comment text' })
  @IsOptional()
  @IsString()
  search?: string;
}

class HideReviewDto {
  @IsString()
  @MinLength(5)
  reason: string;
}

/** Trust & Safety — Reviews view. Hide/unhide are reversible moderation actions, never a delete. */
@ApiTags('admin')
@ApiBearerAuth()
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Controller('admin/reviews')
export class AdminReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get()
  async search(@Query() query: QueryAdminReviewsDto) {
    return this.reviewsService.searchForAdmin(query.search, { cursor: query.cursor, limit: query.limit });
  }

  @Post(':id/hide')
  async hide(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: HideReviewDto,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    return this.reviewsService.hide(id, admin.id, dto.reason);
  }

  @Post(':id/unhide')
  async unhide(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() admin: AuthenticatedUser) {
    return this.reviewsService.unhide(id, admin.id);
  }
}
