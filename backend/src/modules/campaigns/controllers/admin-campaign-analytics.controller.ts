import { Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CursorPaginationDto } from '@common/dto/cursor-pagination.dto';
import { Roles } from '@common/decorators/roles.decorator';
import { RequirePermission } from '@common/decorators/require-permission.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { UserRole } from '@modules/identity/enums/user-role.enum';
import { AuthenticatedUser } from '@modules/identity/strategies/jwt.strategy';
import { CampaignTrafficService } from '../services/campaign-traffic.service';
import { ReferralFraudFlagService } from '../services/referral-fraud-flag.service';

/** Phase 7 — traffic funnel + fraud review, the two read-mostly surfaces the brief's §14 asks for. */
@ApiTags('admin')
@ApiBearerAuth()
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Controller('admin/campaigns/analytics')
export class AdminCampaignAnalyticsController {
  constructor(
    private readonly trafficService: CampaignTrafficService,
    private readonly fraudFlagService: ReferralFraudFlagService,
  ) {}

  @Get('funnel')
  async funnel(@Query('days') days?: string) {
    return this.trafficService.getFunnel(days ? Number(days) : undefined);
  }

  @Get('fraud-flags')
  async fraudFlags(@Query() query: CursorPaginationDto, @Query('status') status?: string) {
    return this.fraudFlagService.search(status !== 'all', query.cursor, query.limit);
  }

  @RequirePermission('campaigns.moderate')
  @Post('fraud-flags/:id/acknowledge')
  async acknowledge(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    return this.fraudFlagService.acknowledge(id, admin.id);
  }
}
