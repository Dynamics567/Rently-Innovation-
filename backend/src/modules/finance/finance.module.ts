import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLogModule } from '@common/audit/audit-log.module';
import { IdentityModule } from '@modules/identity/identity.module';

import { Transaction } from './entities/transaction.entity';
import { Settlement } from './entities/settlement.entity';

import { TransactionRepository } from './repositories/transaction.repository';
import { SettlementRepository } from './repositories/settlement.repository';

import { FinanceService } from './services/finance.service';

import { AdminFinanceController } from './controllers/admin-finance.controller';

/**
 * A leaf module (same placement pattern as AuditLogModule/StorageModule) —
 * BookingModule imports this to call FinanceService from inside its own
 * booking/dispute transactions; FinanceModule depends on nothing from
 * Booking, so there's no cycle.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Transaction, Settlement]), AuditLogModule, IdentityModule],
  controllers: [AdminFinanceController],
  providers: [TransactionRepository, SettlementRepository, FinanceService],
  exports: [FinanceService],
})
export class FinanceModule {}
