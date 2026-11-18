import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '@common/decorators/public.decorator';
import { PointsLedgerService } from '../services/points-ledger.service';
import { SwapConnectIntegrationService } from '../services/swapconnect-integration.service';
import { CampaignTrafficService } from '../services/campaign-traffic.service';
import { RecordTrafficEventDto } from '../dto/record-traffic-event.dto';

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
    private readonly trafficService: CampaignTrafficService,
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

  /** The landing page + ambassador dashboard's funnel tracking (Phase 7) — no PII, see CampaignTrafficEvent's own doc comment. */
  @Public()
  @Post('events')
  async recordEvent(@Body() dto: RecordTrafficEventDto) {
    await this.trafficService.recordEvent(dto);
    return { recorded: true };
  }
}
