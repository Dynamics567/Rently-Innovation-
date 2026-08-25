import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@common/base/base.entity';
import { NotificationType } from '../enums/notification-type.enum';
import { NotificationChannel } from '../enums/notification-channel.enum';

/**
 * `recipientId` is a bare column, not a relation — Notifications never
 * imports Identity's `User` entity directly (module-boundary rule). One row
 * per (recipient, event, channel) — a booking-approved event that warrants
 * both an in-app row and an email produces two rows, so read/unread state
 * is tracked independently per channel.
 */
@Entity('notifications')
@Index(['recipientId', 'readAt'])
export class Notification extends BaseEntity {
  @Column({ name: 'recipient_id' })
  recipientId: string;

  @Column({ type: 'enum', enum: NotificationType })
  type: NotificationType;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  payload: Record<string, unknown>;

  @Column({ type: 'enum', enum: NotificationChannel })
  channel: NotificationChannel;

  @Column({ name: 'read_at', type: 'timestamptz', nullable: true })
  readAt?: Date | null;

  @Column({ name: 'sent_at', type: 'timestamptz', nullable: true })
  sentAt?: Date | null;
}
