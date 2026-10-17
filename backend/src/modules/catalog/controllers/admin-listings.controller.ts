import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';
import { Roles } from '@common/decorators/roles.decorator';
import { RequirePermission } from '@common/decorators/require-permission.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { UserRole } from '@modules/identity/enums/user-role.enum';
import { AuthenticatedUser } from '@modules/identity/strategies/jwt.strategy';
import { ListingsService } from '../services/listings.service';
import { QueryAdminListingsDto } from '../dto/query-admin-listings.dto';

class PauseListingDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

class ListingReasonDto {
  @ApiProperty()
  @IsString()
  @MinLength(5)
  reason: string;
}

/**
 * Every route here requires the ADMIN or SUPER_ADMIN role, same convention
 * as AdminProvidersController (identity module). A listing sits in
 * `pending_review` after a provider publishes it (ListingsService.publish())
 * and only reaches `live` through approve() here — this is that flow's
 * HTTP surface, previously reachable only via approve()/reject() on
 * ListingsController with no way to discover *which* listings needed it.
 */
@ApiTags('admin')
@ApiBearerAuth()
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@RequirePermission('listings.view')
@Controller('admin/listings')
export class AdminListingsController {
  constructor(private readonly listingsService: ListingsService) {}

  @Get('moderation-queue')
  async moderationQueue() {
    return this.listingsService.getModerationQueue();
  }

  /** [Admin] Listings view — every listing platform-wide, any status. The "pending review" filter in the new nav is this same endpoint with status=pending_review, replacing the standalone moderation screen above (kept for backward compatibility, not used by the new UI). */
  @Get()
  async search(@Query() query: QueryAdminListingsDto) {
    return this.listingsService.searchForAdmin(query);
  }

  /** Overview's price-distribution histogram — registered before :id. */
  @Get('analytics/price-distribution')
  async priceDistribution() {
    return this.listingsService.getPriceDistribution();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.listingsService.getDetailForAdmin(id);
  }

  @RequirePermission('listings.moderate')
  @Post(':id/pause')
  async pause(
    @Param('id') id: string,
    @Body() dto: PauseListingDto,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    return this.listingsService.pauseAsAdmin(id, admin.id, dto.reason);
  }

  @RequirePermission('listings.moderate')
  @Post(':id/reinstate')
  async reinstate(@Param('id') id: string, @CurrentUser() admin: AuthenticatedUser) {
    return this.listingsService.reinstateAsAdmin(id, admin.id);
  }

  @RequirePermission('listings.moderate')
  @Post(':id/approve')
  async approve(@Param('id') id: string, @CurrentUser() admin: AuthenticatedUser) {
    return this.listingsService.approve(id, admin.id);
  }

  @RequirePermission('listings.moderate')
  @Post(':id/reject')
  async reject(@Param('id') id: string, @Body() dto: ListingReasonDto, @CurrentUser() admin: AuthenticatedUser) {
    return this.listingsService.reject(id, admin.id, dto.reason);
  }

  /** [PENDING_REVIEW only] "Not quite, but fixable" — distinct from flag() below, which never changes status. */
  @RequirePermission('listings.moderate')
  @Post(':id/request-changes')
  async requestChanges(@Param('id') id: string, @Body() dto: ListingReasonDto, @CurrentUser() admin: AuthenticatedUser) {
    return this.listingsService.requestChanges(id, admin.id, dto.reason);
  }

  /** A standalone marker, valid regardless of status — flagging an already-LIVE listing doesn't pull it offline. */
  @RequirePermission('listings.moderate')
  @Post(':id/flag')
  async flag(@Param('id') id: string, @Body() dto: ListingReasonDto, @CurrentUser() admin: AuthenticatedUser) {
    return this.listingsService.flagListing(id, admin.id, dto.reason);
  }

  @RequirePermission('listings.moderate')
  @Post(':id/photos/:photoId/flag')
  async flagPhoto(
    @Param('id') id: string,
    @Param('photoId') photoId: string,
    @Body() dto: ListingReasonDto,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    return this.listingsService.flagPhoto(id, photoId, admin.id, dto.reason);
  }

  /** Soft-deletes a listing (e.g. test/junk data cleanup) — reversible via deleted_at, audit-logged. */
  @RequirePermission('listings.moderate')
  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() admin: AuthenticatedUser) {
    await this.listingsService.removeAsAdmin(id, admin.id);
    return { removed: true };
  }
}
