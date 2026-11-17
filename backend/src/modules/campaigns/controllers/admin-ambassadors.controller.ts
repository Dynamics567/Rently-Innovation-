import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CursorPaginationDto } from '@common/dto/cursor-pagination.dto';
import { Roles } from '@common/decorators/roles.decorator';
import { RequirePermission } from '@common/decorators/require-permission.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { UserRole } from '@modules/identity/enums/user-role.enum';
import { AuthenticatedUser } from '@modules/identity/strategies/jwt.strategy';
import { AmbassadorService } from '../services/ambassador.service';
import { ReferralAttributionService } from '../services/referral-attribution.service';
import { ReasonDto } from '../dto/reason.dto';
import { ManualAttributeReferralDto } from '../dto/manual-attribute-referral.dto';

/** Mirrors AdminProvidersController's shape exactly — thin routing layer, business logic stays in AmbassadorService. */
@ApiTags('admin')
@ApiBearerAuth()
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Controller('admin/ambassadors')
export class AdminAmbassadorsController {
  constructor(
    private readonly ambassadorService: AmbassadorService,
    private readonly referralAttributionService: ReferralAttributionService,
  ) {}

  @Get()
  async search(@Query() query: CursorPaginationDto) {
    return this.ambassadorService.search(query.cursor, query.limit);
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.ambassadorService.getById(id);
  }

  @Get(':id/referrals')
  async referrals(@Param('id', ParseUUIDPipe) id: string, @Query() query: CursorPaginationDto) {
    return this.referralAttributionService.search(id, query.cursor, query.limit);
  }

  @RequirePermission('campaigns.manage')
  @Post(':id/approve')
  async approve(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() admin: AuthenticatedUser) {
    return this.ambassadorService.approve(id, admin.id);
  }

  @RequirePermission('campaigns.manage')
  @Post(':id/suspend')
  async suspend(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReasonDto,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    return this.ambassadorService.suspend(id, admin.id, dto.reason);
  }

  @RequirePermission('campaigns.manage')
  @Post(':id/reinstate')
  async reinstate(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() admin: AuthenticatedUser) {
    return this.ambassadorService.reinstate(id, admin.id);
  }

  @RequirePermission('campaigns.manage')
  @Post(':id/disqualify')
  async disqualify(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReasonDto,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    return this.ambassadorService.disqualify(id, admin.id, dto.reason);
  }

  @RequirePermission('campaigns.moderate')
  @Post(':id/referrals/manual-attribute')
  async manualAttribute(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ManualAttributeReferralDto,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    return this.referralAttributionService.manualAttribute(id, dto.referredUserId, admin.id, dto.reason);
  }
}
