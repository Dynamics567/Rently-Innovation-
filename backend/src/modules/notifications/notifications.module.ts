import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IdentityModule } from '@modules/identity/identity.module';
import { CatalogModule } from '@modules/catalog/catalog.module';
import { Notification } from './entities/notification.entity';
import { NotificationRepository } from './repositories/notification.repository';
import { NotificationsService } from './services/notifications.service';
import { NotificationsController } from './controllers/notifications.controller';
import { DomainEventsListener } from './listeners/domain-events.listener';

/**
 * Listens (via @OnEvent, added alongside the emitting call sites) to domain
 * events from Booking/Identity/Catalog and writes Notification rows — never
 * imports BookingModule directly, since event payloads carry only ids and
 * this module resolves human-readable details (names, emails, listing
 * titles) through Identity/Catalog's own exported services instead.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Notification]), IdentityModule, CatalogModule],
  controllers: [NotificationsController],
  providers: [NotificationRepository, NotificationsService, DomainEventsListener],
  exports: [NotificationsService],
})
export class NotificationsModule {}
