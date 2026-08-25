import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IdentityModule } from '@modules/identity/identity.module';
import { CatalogModule } from '@modules/catalog/catalog.module';
import { BookingModule } from '@modules/booking/booking.module';
import { NotificationsModule } from '@modules/notifications/notifications.module';

import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';
import { ConversationRepository } from './repositories/conversation.repository';
import { MessageRepository } from './repositories/message.repository';
import { MessagingService } from './services/messaging.service';
import { BookingMessagesController } from './controllers/booking-messages.controller';
import { IsMessagingBookingPartyPolicy } from './policies/is-messaging-booking-party.policy';

/**
 * Imports BookingModule read-only (BookingService.findByIdOrFail, to verify
 * the two parties and lazily create a Conversation) — never the reverse, so
 * no cycle. Same one-directional shape as TrustModule.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Conversation, Message]),
    IdentityModule,
    CatalogModule,
    BookingModule,
    NotificationsModule,
  ],
  controllers: [BookingMessagesController],
  providers: [
    ConversationRepository,
    MessageRepository,
    MessagingService,
    IsMessagingBookingPartyPolicy,
  ],
  exports: [MessagingService],
})
export class MessagingModule {}
