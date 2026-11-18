import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '@common/decorators/public.decorator';
import { PointsLedgerService } from '../services/points-ledger.service';
import { SwapConnectIntegrationService } from '../services/swapconnect-integration.service';

/**
 * The campaign landing page's public data — no auth, unlike
 * AdminAmbassadorsController's equivalents. Leaderboard names come back
 * masked (see PointsLedgerService.getPublicLeaderboard); the prize snapshot
 * is null until an admin has run at least one SwapConnect sync.
 */
@ApiTags('campaigns')
@Controller('campaigns')
export class CampaignsPublicController {
  constructor(
    private readonly pointsLedgerService: PointsLedgerService,
    private readonly integrationService: SwapConnectIntegrationService,
  ) {}

  @Public()
  @Get('leaderboard')
  async leaderboard(@Query('limit') limit?: string) {
    return this.pointsLedgerService.getPublicLeaderboard(limit ? Number(limit) : undefined);
  }

  @Public()
  @Get('prize')
  async prize() {
    return this.integrationService.getPublicSnapshot();
  }
}
