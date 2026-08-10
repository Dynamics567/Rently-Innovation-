import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@common/base/base.entity';
import { BookingStage, BookingStatus } from '../enums/booking.enums';

/** Append-only audit trail — never updated, only inserted. One row per status AND/OR stage transition. */
@Entity('booking_status_history')
@Index(['bookingId'])
export class BookingStatusHistory extends BaseEntity {
  @Column({ name: 'booking_id' })
  bookingId: string;

  @Column({ name: 'from_status', type: 'enum', enum: BookingStatus, nullable: true })
  fromStatus?: BookingStatus | null;

  @Column({ name: 'to_status', type: 'enum', enum: BookingStatus })
  toStatus: BookingStatus;

  @Column({ name: 'from_stage', type: 'enum', enum: BookingStage, nullable: true })
  fromStage?: BookingStage | null;

  @Column({ name: 'to_stage', type: 'enum', enum: BookingStage })
  toStage: BookingStage;

  /** Nullable for system-driven transitions (e.g. a webhook), not attributable to one actor. */
  @Column({ name: 'changed_by', type: 'uuid', nullable: true })
  changedBy?: string | null;

  @Column({ type: 'text', nullable: true })
  reason?: string | null;
}
