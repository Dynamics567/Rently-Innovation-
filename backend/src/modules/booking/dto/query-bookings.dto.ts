import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsIn, IsOptional } from 'class-validator';
import { CursorPaginationDto } from '@common/dto/cursor-pagination.dto';
import { BookingStatus } from '../enums/booking.enums';

export class QueryBookingsDto extends CursorPaginationDto {
  @ApiPropertyOptional({ enum: ['renter', 'provider'], default: 'renter' })
  @IsOptional()
  @IsIn(['renter', 'provider'])
  role?: 'renter' | 'provider';

  @ApiPropertyOptional({ enum: BookingStatus })
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;
}
