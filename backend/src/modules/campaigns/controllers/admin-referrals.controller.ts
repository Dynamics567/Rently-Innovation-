import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { CursorPaginationDto } from '@common/dto/cursor-pagination.dto';
import { Roles } from '@common/decorators/roles.decorator';
import { RequirePermission } from '@common/decorators/require-permission.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { UserRole } from '@modules/identity/enums/user-role.enum';
import { AuthenticatedUser } from '@modules/identity/strategies/jwt.strategy';
import { toCsv, sendCsv } from '@common/utils/csv-export.util';
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

  /** CSV export (Phase 7) — registered before :id. */
  @Get('export')
  async exportCsv(@Res() res: Response) {
    const rows = await this.referralAttributionService.listAllForExport();
    const csv = toCsv(rows as any[], [
      { header: 'Ambassador', value: (r: any) => r.ambassadorName ?? r.ambassadorId },
      { header: 'Referred user', value: (r: any) => r.referredUser?.fullName ?? r.referredUserId },
      { header: 'Referral code', value: (r: any) => r.referralCode },
      { header: 'Source', value: (r: any) => r.source },
      { header: 'Status', value: (r: any) => r.status },
      { header: 'Rejection reason', value: (r: any) => r.rejectionReason ?? '' },
      { header: 'Created at', value: (r: any) => r.createdAt.toISOString() },
    ]);
    sendCsv(res, 'referrals.csv', csv);
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
