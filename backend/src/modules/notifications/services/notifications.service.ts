import { Inject, Injectable, Logger } from '@nestjs/common';
import { DomainException } from '@common/errors/domain.exception';
import { ErrorCode } from '@common/errors/error-codes.enum';
import { CursorPage } from '@common/dto/cursor-pagination.dto';
import { EMAIL_SENDER, EmailSender } from '@modules/identity/services/email-sender.port';
import { Notification } from '../entities/notification.entity';
import { NotificationRepository } from '../repositories/notification.repository';
import { NotificationType } from '../enums/notification-type.enum';
import { NotificationChannel } from '../enums/notification-channel.enum';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly repository: NotificationRepository,
    @Inject(EMAIL_SENDER) private readonly emailSender: EmailSender,
  ) {}

  async notifyInApp(
    recipientId: string,
    type: NotificationType,
    payload: Record<string, unknown> = {},
  ): Promise<Notification> {
    const row = this.repository.create({
      recipientId,
      type,
      payload,
      channel: NotificationChannel.IN_APP,
      sentAt: new Date(),
    });
    return this.repository.save(row);
  }

  /**
   * A broken email provider must never break the flow that triggered it
   * (a booking approval succeeding is the point; the confirmation email is
   * a nice-to-have on top) — failures are logged, not thrown, same
   * philosophy as AuthService.requestPasswordReset()'s email try/catch.
   */
  async notifyEmail(
    recipientId: string,
    to: string,
    type: NotificationType,
    payload: Record<string, unknown>,
    subject: string,
    body: string,
  ): Promise<Notification> {
    const row = this.repository.create({
      recipientId,
      type,
      payload,
      channel: NotificationChannel.EMAIL,
    });
    const saved = await this.repository.save(row);
    try {
      await this.emailSender.send(to, subject, body);
      saved.sentAt = new Date();
      return this.repository.save(saved);
    } catch (err) {
      this.logger.error(`Failed to send ${type} email to ${to}: ${(err as Error).message}`);
      return saved;
    }
  }

  async listForUser(
    userId: string,
    filter: { unread?: boolean; cursor?: string; limit?: number },
  ): Promise<CursorPage<Notification>> {
    return this.repository.listForRecipient(userId, {
      unreadOnly: filter.unread,
      cursor: filter.cursor,
      limit: filter.limit,
    });
  }

  async markRead(id: string, userId: string): Promise<Notification> {
    const notification = await this.repository.findByIdOrFail(id, 'Notification');
    if (notification.recipientId !== userId) {
      throw DomainException.forbidden(ErrorCode.FORBIDDEN, "You can't manage another user's notifications.");
    }
    notification.readAt = new Date();
    return this.repository.save(notification);
  }

  async markAllRead(userId: string): Promise<void> {
    await this.repository.markAllRead(userId);
  }
}
