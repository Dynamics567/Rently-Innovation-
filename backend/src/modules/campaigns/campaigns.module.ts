import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLogModule } from '@common/audit/audit-log.module';
import { IdentityModule } from '@modules/identity/identity.module';

import { AmbassadorProfile } from './entities/ambassador-profile.entity';
import { ReferralAttribution } from './entities/referral-attribution.entity';
import { ReferralMilestone } from './entities/referral-milestone.entity';

import { AmbassadorProfileRepository } from './repositories/ambassador-profile.repository';
import { ReferralAttributionRepository } from './repositories/referral-attribution.repository';
import { ReferralMilestoneRepository } from './repositories/referral-milestone.repository';

import { AmbassadorService } from './services/ambassador.service';
import { ReferralAttributionService } from './services/referral-attribution.service';

import { ReferralMilestoneListener } from './listeners/referral-milestone.listener';
import { SignupReferralListener } from './listeners/signup-referral.listener';

import { AmbassadorsController } from './controllers/ambassadors.controller';
import { AdminAmbassadorsController } from './controllers/admin-ambassadors.controller';
import { AdminReferralsController } from './controllers/admin-referrals.controller';

/**
 * Phase 2 of the Rently x SwapConnect campaign integration (see
 * docs/plans — Cross-Platform Campaign Integration). Imports IdentityModule
 * one-directionally (for UsersService + ProviderProfileService, both
 * exported) — Identity never imports this back; the one place it needs to
 * reach this module's logic (resolving a signup's referralCode) goes
 * through the shared EventEmitter2 bus instead, exactly like
 * NotificationsModule already does for Booking/Catalog/Identity events.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([AmbassadorProfile, ReferralAttribution, ReferralMilestone]),
    AuditLogModule,
    IdentityModule,
  ],
  controllers: [AmbassadorsController, AdminAmbassadorsController, AdminReferralsController],
  providers: [
    AmbassadorProfileRepository,
    ReferralAttributionRepository,
    ReferralMilestoneRepository,
    AmbassadorService,
    ReferralAttributionService,
    ReferralMilestoneListener,
    SignupReferralListener,
  ],
  exports: [AmbassadorService, ReferralAttributionService],
})
export class CampaignsModule {}
