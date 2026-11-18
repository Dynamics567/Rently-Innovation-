import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuditLogModule } from '@common/audit/audit-log.module';
import { IdentityModule } from '@modules/identity/identity.module';
import { SwapConnectConfig } from '@config/configuration';

import { AmbassadorProfile } from './entities/ambassador-profile.entity';
import { ReferralAttribution } from './entities/referral-attribution.entity';
import { ReferralMilestone } from './entities/referral-milestone.entity';
import { PointsLedgerEntry } from './entities/points-ledger-entry.entity';
import { CampaignPrizeSnapshot } from './entities/campaign-prize-snapshot.entity';
import { CampaignTrafficEvent } from './entities/campaign-traffic-event.entity';
import { ReferralFraudFlag } from './entities/referral-fraud-flag.entity';

import { AmbassadorProfileRepository } from './repositories/ambassador-profile.repository';
import { ReferralAttributionRepository } from './repositories/referral-attribution.repository';
import { ReferralMilestoneRepository } from './repositories/referral-milestone.repository';
import { PointsLedgerRepository } from './repositories/points-ledger.repository';
import { CampaignPrizeSnapshotRepository } from './repositories/campaign-prize-snapshot.repository';
import { CampaignTrafficEventRepository } from './repositories/campaign-traffic-event.repository';
import { ReferralFraudFlagRepository } from './repositories/referral-fraud-flag.repository';

import { AmbassadorService } from './services/ambassador.service';
import { ReferralAttributionService } from './services/referral-attribution.service';
import { PointsLedgerService } from './services/points-ledger.service';
import { SwapConnectClient } from './services/swapconnect-client';
import {
  SwapConnectIntegrationService,
  SWAPCONNECT_CLIENT,
} from './services/swapconnect-integration.service';
import { CampaignTrafficService } from './services/campaign-traffic.service';
import { ReferralFraudFlagService } from './services/referral-fraud-flag.service';

import { ReferralMilestoneListener } from './listeners/referral-milestone.listener';
import { SignupReferralListener } from './listeners/signup-referral.listener';

import { AmbassadorsController } from './controllers/ambassadors.controller';
import { AdminAmbassadorsController } from './controllers/admin-ambassadors.controller';
import { AdminReferralsController } from './controllers/admin-referrals.controller';
import { AdminSwapConnectController } from './controllers/admin-swapconnect.controller';
import { AdminCampaignAnalyticsController } from './controllers/admin-campaign-analytics.controller';
import { CampaignsPublicController } from './controllers/campaigns-public.controller';

/**
 * Phases 2-3 of the Rently x SwapConnect campaign integration (see
 * docs/plans — Cross-Platform Campaign Integration). Imports IdentityModule
 * one-directionally (for UsersService + ProviderProfileService, both
 * exported) — Identity never imports this back; the one place it needs to
 * reach this module's logic (resolving a signup's referralCode) goes
 * through the shared EventEmitter2 bus instead, exactly like
 * NotificationsModule already does for Booking/Catalog/Identity events.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      AmbassadorProfile,
      ReferralAttribution,
      ReferralMilestone,
      PointsLedgerEntry,
      CampaignPrizeSnapshot,
      CampaignTrafficEvent,
      ReferralFraudFlag,
    ]),
    AuditLogModule,
    IdentityModule,
    ConfigModule,
  ],
  controllers: [
    AmbassadorsController,
    AdminAmbassadorsController,
    AdminReferralsController,
    AdminSwapConnectController,
    AdminCampaignAnalyticsController,
    CampaignsPublicController,
  ],
  providers: [
    AmbassadorProfileRepository,
    ReferralAttributionRepository,
    ReferralMilestoneRepository,
    PointsLedgerRepository,
    CampaignPrizeSnapshotRepository,
    CampaignTrafficEventRepository,
    ReferralFraudFlagRepository,
    PointsLedgerService,
    AmbassadorService,
    ReferralAttributionService,
    SwapConnectIntegrationService,
    CampaignTrafficService,
    ReferralFraudFlagService,
    ReferralMilestoneListener,
    SignupReferralListener,
    {
      // null, not a thrown error, when credentials are missing — Phase 5's
      // whole point is that this stays a valid, visibly "pending" state.
      provide: SWAPCONNECT_CLIENT,
      useFactory: (configService: ConfigService) => {
        const cfg = configService.get<SwapConnectConfig>('swapConnect')!;
        return cfg.apiBase && cfg.partnerApiKey && cfg.campaignId
          ? new SwapConnectClient({
              apiBase: cfg.apiBase,
              partnerApiKey: cfg.partnerApiKey,
              campaignId: cfg.campaignId,
            })
          : null;
      },
      inject: [ConfigService],
    },
  ],
  exports: [AmbassadorService, ReferralAttributionService, PointsLedgerService],
})
export class CampaignsModule {}
