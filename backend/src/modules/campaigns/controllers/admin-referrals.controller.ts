import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CursorPaginationDto } from '@common/dto/cursor-pagination.dto';
import { Roles } from '@common/decorators/roles.decorator';
import { RequirePermission } from '@common/decorators/require-permission.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { UserRole } from '@modules/identity/enums/user-role.enum';
import { AuthenticatedUser } from '@modules/identity/strategies/jwt.strategy';
import { ReferralAttributionService } from '../services/referral-attribution.service';
import { ReasonDto } from '../dto/reason.dto';

@ApiTags('admin')
@ApiBearerAuth()
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Controller('admin/referrals')
export class AdminReferralsController {
  constructor(private readonly referralAttributionService: ReferralAttributionService) {}

  @Get()
  async search(@Query() query: CursorPaginationDto) {
    return this.referralAttributionService.search(undefined, query.cursor, query.limit);
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.referralAttributionService.getById(id);
  }

  @RequirePermission('campaigns.moderate')
  @Post(':id/reject')
  async reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReasonDto,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    return this.referralAttributionService.reject(id, admin.id, dto.reason);
  }
}
