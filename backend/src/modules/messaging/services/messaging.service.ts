import { Injectable, Logger } from '@nestjs/common';
import { DomainException } from '@common/errors/domain.exception';
import { ErrorCode } from '@common/errors/error-codes.enum';
import { BookingService } from '@modules/booking/services/booking.service';
import { ListingsService } from '@modules/catalog/services/listings.service';
import { ProviderProfileService } from '@modules/identity/services/provider-profile.service';
import { NotificationsService } from '@modules/notifications/services/notifications.service';
import { NotificationType } from '@modules/notifications/enums/notification-type.enum';
import { ConversationRepository } from '../repositories/conversation.repository';
import { MessageRepository } from '../repositories/message.repository';
import { Conversation } from '../entities/conversation.entity';
import { Message } from '../entities/message.entity';

@Injectable()
export class MessagingService {
  private readonly logger = new Logger(MessagingService.name);

  constructor(
    private readonly conversationRepository: ConversationRepository,
    private readonly messageRepository: MessageRepository,
    private readonly bookingService: BookingService,
    private readonly listingsService: ListingsService,
    private readonly providerProfileService: ProviderProfileService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private async getOrCreateConversation(bookingId: string): Promise<Conversation> {
    const existing = await this.conversationRepository.findByBooking(bookingId);
    if (existing) return existing;

    const booking = await this.bookingService.findByIdOrFail(bookingId);
    const listing = await this.listingsService.findByIdOrFail(booking.listingId);
    const providerProfile = await this.providerProfileService.getById(listing.providerId);

    const conversation = this.conversationRepository.create({
      bookingId,
      renterId: booking.renterId,
      providerUserId: providerProfile.userId,
    });
    return this.conversationRepository.save(conversation);
  }

  async listMessages(bookingId: string): Promise<Message[]> {
    const conversation = await this.conversationRepository.findByBooking(bookingId);
    if (!conversation) return [];
    return this.messageRepository.listForConversation(conversation.id);
  }

  async sendMessage(bookingId: string, senderId: string, body: string): Promise<Message> {
    const conversation = await this.getOrCreateConversation(bookingId);
    if (senderId !== conversation.renterId && senderId !== conversation.providerUserId) {
      throw DomainException.forbidden(ErrorCode.FORBIDDEN, "You aren't a party to this booking's conversation.");
    }

    const message = this.messageRepository.create({ conversationId: conversation.id, senderId, body });
    const saved = await this.messageRepository.save(message);

    const recipientId = senderId === conversation.renterId ? conversation.providerUserId : conversation.renterId;
    this.notificationsService
      .notifyInApp(recipientId, NotificationType.MESSAGE_RECEIVED, { bookingId, messageId: saved.id })
      .catch((err) =>
        this.logger.error(`Failed to write MESSAGE_RECEIVED notification for booking ${bookingId}: ${(err as Error).message}`),
      );

    return saved;
  }

  async markRead(bookingId: string, recipientId: string): Promise<void> {
    const conversation = await this.conversationRepository.findByBooking(bookingId);
    if (!conversation) return;
    await this.messageRepository.markReadForRecipient(conversation.id, recipientId);
  }
}
