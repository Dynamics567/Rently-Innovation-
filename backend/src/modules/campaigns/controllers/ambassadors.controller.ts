import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { CursorPaginationDto } from '@common/dto/cursor-pagination.dto';
import { AuthenticatedUser } from '@modules/identity/strategies/jwt.strategy';
import { AmbassadorService } from '../services/ambassador.service';
import { ReferralAttributionService } from '../services/referral-attribution.service';
import { PointsLedgerService } from '../services/points-ledger.service';
import { RegisterAmbassadorDto } from '../dto/register-ambassador.dto';

/**
 * No @Roles() gate here, deliberately — same pattern as ProvidersController's
 * `POST /providers/profile` (any authenticated user can "upgrade"; the
 * service methods are the actual authority, via AmbassadorProfile.status,
 * not a JWT role claim that would go stale until the next token refresh).
 */
@ApiTags('ambassadors')
@ApiBearerAuth()
@Controller('ambassadors')
export class AmbassadorsController {
  constructor(
    private readonly ambassadorService: AmbassadorService,
    private readonly referralAttributionService: ReferralAttributionService,
    private readonly pointsLedgerService: PointsLedgerService,
  ) {}

  @Post('register')
  async register(@CurrentUser() user: AuthenticatedUser, @Body() _dto: RegisterAmbassadorDto) {
    return this.ambassadorService.register(user.id);
  }

  @Get('me')
  async getMyProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.ambassadorService.getByUserId(user.id);
  }

  @Get('me/referrals')
  async getMyReferrals(@CurrentUser() user: AuthenticatedUser, @Query() query: CursorPaginationDto) {
    const profile = await this.ambassadorService.getByUserId(user.id);
    return this.referralAttributionService.search(profile.id, query.cursor, query.limit);
  }

  @Get('me/points')
  async getMyPoints(@CurrentUser() user: AuthenticatedUser, @Query() query: CursorPaginationDto) {
    const profile = await this.ambassadorService.getByUserId(user.id);
    return this.pointsLedgerService.getHistory(profile.id, query.cursor, query.limit);
  }

  /** Backs the ambassador dashboard's single landing call — profile (incl. pointsBalance), rank, and referral counts by status, in one round trip. */
  @Get('me/summary')
  async getMySummary(@CurrentUser() user: AuthenticatedUser) {
    const profile = await this.ambassadorService.getByUserId(user.id);
    const [rank, referralCounts] = await Promise.all([
      this.pointsLedgerService.getRank(profile.id),
      this.referralAttributionService.getCounts(profile.id),
    ]);
    return { profile, rank, referralCounts };
  }
}
