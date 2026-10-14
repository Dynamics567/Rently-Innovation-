import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { CursorPaginationDto } from '@common/dto/cursor-pagination.dto';
import { TransactionType } from '../enums/transaction-type.enum';

export class QueryAdminTransactionsDto extends CursorPaginationDto {
  @ApiPropertyOptional({
    enum: TransactionType,
    description: 'The Refunds admin view is this same list with type=refund.',
  })
  @IsOptional()
  @IsEnum(TransactionType)
  type?: TransactionType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  bookingId?: string;

  @ApiPropertyOptional({ description: 'A Rental Partner\'s transaction history, for the Wallets detail drawer' })
  @IsOptional()
  @IsUUID()
  providerId?: string;

  @ApiPropertyOptional({ description: 'Only transactions on/after this date' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'Only transactions on/before this date' })
  @IsOptional()
  @IsDateString()
  to?: string;
}
