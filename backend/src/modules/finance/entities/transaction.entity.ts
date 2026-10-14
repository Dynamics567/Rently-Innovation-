import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@common/base/base.entity';
import { BigIntNumberTransformer } from '@common/transformers/bigint-number.transformer';
import { TransactionType } from '../enums/transaction-type.enum';

/**
 * The ledger's spine — one row per real money event already happening on a
 * booking (see FinanceService's doc comment for which BookingService/
 * DisputeService call sites create these). Bare FK columns, not TypeORM
 * relations, same convention AdminRolePermission/UserAdminRole established
 * in Phase D — avoids adding a relation onto the heavily-used Booking/User
 * entities.
 *
 * A provider's wallet balance is never stored here or anywhere else — it's
 * always `SUM(amountMinor)` over this table where `settlementId IS NULL`,
 * computed on demand (see FinanceService.computeWalletBalance). Setting
 * `settlementId` is the one mutation this table ever receives after insert.
 */
@Entity('transactions')
@Index(['bookingId'])
@Index(['providerId'])
@Index(['settlementId'])
export class Transaction extends BaseEntity {
  @Column({ name: 'booking_id' })
  bookingId: string;

  @Column({ type: 'enum', enum: TransactionType })
  type: TransactionType;

  @Column({ name: 'amount_minor', type: 'bigint', transformer: BigIntNumberTransformer })
  amountMinor: number;

  @Column({ name: 'renter_id', type: 'uuid', nullable: true })
  renterId?: string | null;

  @Column({ name: 'provider_id', type: 'uuid', nullable: true })
  providerId?: string | null;

  @Column({ name: 'dispute_id', type: 'uuid', nullable: true })
  disputeId?: string | null;

  @Column({ name: 'settlement_id', type: 'uuid', nullable: true })
  settlementId?: string | null;

  @Column({ name: 'payment_reference', type: 'text', nullable: true })
  paymentReference?: string | null;
}
