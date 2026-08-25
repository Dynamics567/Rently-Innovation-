import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IdentityModule } from '@modules/identity/identity.module';
import { CatalogModule } from '@modules/catalog/catalog.module';

import { Booking } from './entities/booking.entity';
import { BookingStatusHistory } from './entities/booking-status-history.entity';
import { BookingExtensionRequest } from './entities/booking-extension-request.entity';
import { Dispute } from './entities/dispute.entity';

import { BookingRepository } from './repositories/booking.repository';
import { BookingStatusHistoryRepository } from './repositories/booking-status-history.repository';
import { BookingExtensionRequestRepository } from './repositories/booking-extension-request.repository';
import { DisputeRepository } from './repositories/dispute.repository';

import { BookingService } from './services/booking.service';
import { DisputeService } from './services/dispute.service';
import { PAYMENT_PORT, MockPaymentAdapter } from './services/payment.port';

import { BookingsController } from './controllers/bookings.controller';
import { BookingExtensionsController } from './controllers/booking-extensions.controller';
import { DisputesController } from './controllers/disputes.controller';
import { AdminDisputesController } from './controllers/admin-disputes.controller';

import { IsBookingProviderPolicy } from './policies/is-booking-provider.policy';
import { IsBookingPartyPolicy } from './policies/is-booking-party.policy';
import { IsExtensionBookingPartyPolicy } from './policies/is-extension-booking-party.policy';
import { IsExtensionBookingProviderPolicy } from './policies/is-extension-booking-provider.policy';
import { IsDisputePartyPolicy } from './policies/is-dispute-party.policy';

/**
 * `PAYMENT_PORT` is bound to `MockPaymentAdapter` for this phase — see
 * services/payment.port.ts. Swapping in a real `PaystackAdapter` later
 * (Payments phase, Phase 1 plan roadmap) is a one-line change here.
 *
 * Dispute lives here (not a separate Trust-style module) because resolving
 * one calls back into BookingService to finalize the booking — see
 * Dispute entity's doc comment for why that would otherwise be a module
 * cycle.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Booking, BookingStatusHistory, BookingExtensionRequest, Dispute]),
    IdentityModule,
    CatalogModule,
  ],
  controllers: [
    BookingsController,
    BookingExtensionsController,
    DisputesController,
    AdminDisputesController,
  ],
  providers: [
    BookingRepository,
    BookingStatusHistoryRepository,
    BookingExtensionRequestRepository,
    DisputeRepository,
    BookingService,
    DisputeService,
    { provide: PAYMENT_PORT, useClass: MockPaymentAdapter },
    IsBookingProviderPolicy,
    IsBookingPartyPolicy,
    IsExtensionBookingPartyPolicy,
    IsExtensionBookingProviderPolicy,
    IsDisputePartyPolicy,
  ],
  exports: [BookingService, DisputeService],
})
export class BookingModule {}
