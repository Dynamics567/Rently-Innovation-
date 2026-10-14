import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '@common/decorators/roles.decorator';
import { RequirePermission } from '@common/decorators/require-permission.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { UserRole } from '@modules/identity/enums/user-role.enum';
import { AuthenticatedUser } from '@modules/identity/strategies/jwt.strategy';
import { FinanceService } from '../services/finance.service';
import { QueryAdminTransactionsDto } from '../dto/query-admin-transactions.dto';
import { CreateSettlementDto } from '../dto/create-settlement.dto';
import { MarkSettlementPaidDto } from '../dto/mark-settlement-paid.dto';

/**
 * `finance.view` covers every read here (Transactions, the Refunds-filtered
 * view of the same list, Wallets, Settlements); `finance.settle` is the
 * narrower grant for the two mutating routes — matches the exact split
 * Phase D's own plan predicted Finance Admin would need once this phase
 * shipped.
 */
@ApiTags('admin')
@ApiBearerAuth()
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@RequirePermission('finance.view')
@Controller('admin/finance')
export class AdminFinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get('transactions')
  async searchTransactions(@Query() query: QueryAdminTransactionsDto) {
    return this.financeService.searchTransactions({
      type: query.type,
      bookingId: query.bookingId,
      providerId: query.providerId,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
      cursor: query.cursor,
      limit: query.limit,
    });
  }

  @Get('transactions/:id')
  async getTransaction(@Param('id', ParseUUIDPipe) id: string) {
    return this.financeService.getTransactionOrFail(id);
  }

  @Get('wallets')
  async listWallets() {
    return this.financeService.listWallets();
  }

  @Get('wallets/:providerId')
  async getWallet(@Param('providerId', ParseUUIDPipe) providerId: string) {
    return this.financeService.computeWalletBalance(providerId);
  }

  @Get('settlements')
  async searchSettlements(@Query('providerId') providerId?: string, @Query('cursor') cursor?: string) {
    return this.financeService.searchSettlements({ providerId, cursor });
  }

  @Get('settlements/:id')
  async getSettlement(@Param('id', ParseUUIDPipe) id: string) {
    return this.financeService.getSettlementOrFail(id);
  }

  @Post('settlements')
  @RequirePermission('finance.settle')
  async createSettlement(@Body() dto: CreateSettlementDto, @CurrentUser() admin: AuthenticatedUser) {
    return this.financeService.createSettlement(dto.providerId, admin.id);
  }

  @Patch('settlements/:id/paid')
  @RequirePermission('finance.settle')
  async markSettlementPaid(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MarkSettlementPaidDto,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    return this.financeService.markSettlementPaid(id, dto.reference, admin.id);
  }
}
