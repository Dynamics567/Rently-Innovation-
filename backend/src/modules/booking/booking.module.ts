import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IdentityModule } from '@modules/identity/identity.module';
import { CatalogModule } from '@modules/catalog/catalog.module';

import { Booking } from './entities/booking.entity';
import { BookingStatusHistory } from './entities/booking-status-history.entity';
import { BookingExtensionRequest } from './entities/booking-extension-request.entity';

import { BookingRepository } from './repositories/booking.repository';
import { BookingStatusHistoryRepository } from './repositories/booking-status-history.repository';
import { BookingExtensionRequestRepository } from './repositories/booking-extension-request.repository';

import { BookingService } from './services/booking.service';
import { PAYMENT_PORT, MockPaymentAdapter } from './services/payment.port';

import { BookingsController } from './controllers/bookings.controller';
import { BookingExtensionsController } from './controllers/booking-extensions.controller';

import { IsBookingProviderPolicy } from './policies/is-booking-provider.policy';
import { IsBookingPartyPolicy } from './policies/is-booking-party.policy';
import { IsExtensionBookingPartyPolicy } from './policies/is-extension-booking-party.policy';
import { IsExtensionBookingProviderPolicy } from './policies/is-extension-booking-provider.policy';

/**
 * `PAYMENT_PORT` is bound to `MockPaymentAdapter` for this phase — see
 * services/payment.port.ts. Swapping in a real `PaystackAdapter` later
 * (Payments phase, Phase 1 plan roadmap) is a one-line change here.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Booking, BookingStatusHistory, BookingExtensionRequest]),
    IdentityModule,
    CatalogModule,
  ],
  controllers: [BookingsController, BookingExtensionsController],
  providers: [
    BookingRepository,
    BookingStatusHistoryRepository,
    BookingExtensionRequestRepository,
    BookingService,
    { provide: PAYMENT_PORT, useClass: MockPaymentAdapter },
    IsBookingProviderPolicy,
    IsBookingPartyPolicy,
    IsExtensionBookingPartyPolicy,
    IsExtensionBookingProviderPolicy,
  ],
  exports: [BookingService],
})
export class BookingModule {}
