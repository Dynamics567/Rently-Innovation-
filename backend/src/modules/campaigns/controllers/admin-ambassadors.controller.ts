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
import { AmbassadorService } from '../services/ambassador.service';
import { ReferralAttributionService } from '../services/referral-attribution.service';
import { PointsLedgerService } from '../services/points-ledger.service';
import { ReasonDto } from '../dto/reason.dto';
import { ManualAttributeReferralDto } from '../dto/manual-attribute-referral.dto';
import { AdjustPointsDto } from '../dto/adjust-points.dto';

/** Mirrors AdminProvidersController's shape exactly — thin routing layer, business logic stays in the services. */
@ApiTags('admin')
@ApiBearerAuth()
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Controller('admin/ambassadors')
export class AdminAmbassadorsController {
  constructor(
    private readonly ambassadorService: AmbassadorService,
    private readonly referralAttributionService: ReferralAttributionService,
    private readonly pointsLedgerService: PointsLedgerService,
  ) {}

  @Get()
  async search(@Query() query: CursorPaginationDto) {
    return this.ambassadorService.search(query.cursor, query.limit);
  }

  /** Registered before :id, same reasoning as AdminProvidersController's verification-queue — "leaderboard" would otherwise be swallowed by the :id param route. */
  @Get('leaderboard')
  async leaderboard(@Query('limit') limit?: string) {
    return this.pointsLedgerService.getLeaderboard(limit ? Number(limit) : undefined);
  }

  /** CSV export (Phase 7) — also registered before :id. */
  @Get('export')
  async exportCsv(@Res() res: Response) {
    const rows = await this.ambassadorService.listAllForExport();
    const csv = toCsv(rows as any[], [
      { header: 'Ambassador', value: (r: any) => r.user?.fullName ?? r.userId },
      { header: 'Email', value: (r: any) => r.user?.email ?? '' },
      { header: 'Phone', value: (r: any) => r.user?.phone ?? '' },
      { header: 'Referral code', value: (r: any) => r.referralCode },
      { header: 'Status', value: (r: any) => r.status },
      { header: 'Points balance', value: (r: any) => r.pointsBalance },
      { header: 'Registered at', value: (r: any) => r.createdAt.toISOString() },
    ]);
    sendCsv(res, 'ambassadors.csv', csv);
  }

  /** CSV export (Phase 7), points ledger across every ambassador. */
  @Get('points/export')
  async exportPointsCsv(@Res() res: Response) {
    const rows = await this.pointsLedgerService.listAllForExport();
    const csv = toCsv(rows, [
      { header: 'Ambassador', value: (r) => r.ambassadorName ?? r.ambassadorId },
      { header: 'Type', value: (r) => r.type },
      { header: 'Points delta', value: (r) => r.pointsDelta },
      { header: 'Reason', value: (r) => r.reason ?? '' },
      { header: 'Date', value: (r) => r.createdAt.toISOString() },
    ]);
    sendCsv(res, 'points-ledger.csv', csv);
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.ambassadorService.getById(id);
  }

  @Get(':id/referrals')
  async referrals(@Param('id', ParseUUIDPipe) id: string, @Query() query: CursorPaginationDto) {
    return this.referralAttributionService.search(id, query.cursor, query.limit);
  }

  @Get(':id/points')
  async points(@Param('id', ParseUUIDPipe) id: string, @Query() query: CursorPaginationDto) {
    return this.pointsLedgerService.getHistory(id, query.cursor, query.limit);
  }

  @RequirePermission('campaigns.manage')
  @Post(':id/points/adjust')
  async adjustPoints(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdjustPointsDto,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    return this.pointsLedgerService.manualAdjust(id, dto.pointsDelta, admin.id, dto.reason);
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
    return this.referralAttributionService.manualAttribute(
      id,
      dto.referredUserId,
      admin.id,
      dto.reason,
    );
  }
}
