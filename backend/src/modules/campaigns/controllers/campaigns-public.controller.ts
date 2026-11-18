import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '@common/decorators/public.decorator';
import { PointsLedgerService } from '../services/points-ledger.service';

/**
 * The campaign landing page's public leaderboard — no auth, unlike
 * AdminAmbassadorsController's leaderboard route. Names come back masked
 * (see PointsLedgerService.getPublicLeaderboard) so a public competition
 * board never leaks another ambassador's full identity.
 */
@ApiTags('campaigns')
@Controller('campaigns')
export class CampaignsPublicController {
  constructor(private readonly pointsLedgerService: PointsLedgerService) {}

  @Public()
  @Get('leaderboard')
  async leaderboard(@Query('limit') limit?: string) {
    return this.pointsLedgerService.getPublicLeaderboard(limit ? Number(limit) : undefined);
  }
}
