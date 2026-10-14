import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@common/base/base.entity';
import { BigIntNumberTransformer } from '@common/transformers/bigint-number.transformer';
import { SettlementStatus } from '../enums/settlement-status.enum';

/**
 * A manual, admin-recorded payout — not an automated one. No PaymentPort
 * call backs `markSettlementPaid`: there is no real payment processor
 * integrated yet (deliberate Phase E scope decision — see FinanceService's
 * doc comment), so "paid" means an admin bank-transferred a provider
 * off-platform and is recording that here, not that this system moved any
 * money. `totalMinor` is computed once at creation from the provider's real
 * unsettled Transaction rows and never recalculated afterward.
 */
@Entity('settlements')
@Index(['providerId'])
export class Settlement extends BaseEntity {
  @Column({ name: 'provider_id' })
  providerId: string;

  @Column({ name: 'total_minor', type: 'bigint', transformer: BigIntNumberTransformer })
  totalMinor: number;

  @Column({ type: 'enum', enum: SettlementStatus, default: SettlementStatus.PENDING })
  status: SettlementStatus;

  @Column({ name: 'paid_at', type: 'timestamptz', nullable: true })
  paidAt?: Date | null;

  @Column({ name: 'paid_reference', type: 'text', nullable: true })
  paidReference?: string | null;

  @Column({ name: 'paid_by_admin_id', type: 'uuid', nullable: true })
  paidByAdminId?: string | null;

  @Column({ name: 'created_by_admin_id' })
  createdByAdminId: string;
}
