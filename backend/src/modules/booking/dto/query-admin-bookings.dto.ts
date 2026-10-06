import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { CursorPaginationDto } from '@common/dto/cursor-pagination.dto';
import { BookingStage, BookingStatus } from '../enums/booking.enums';

export class QueryAdminBookingsDto extends CursorPaginationDto {
  @ApiPropertyOptional({ description: "A customer's bookings, for the Customers detail drawer's Activity tab" })
  @IsOptional()
  @IsUUID()
  renterId?: string;

  @ApiPropertyOptional({ enum: BookingStatus })
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;

  @ApiPropertyOptional({
    enum: BookingStage,
    description: 'The "Returns" view is this same list with stage=returnsched|returned|inspected.',
  })
  @IsOptional()
  @IsEnum(BookingStage)
  stage?: BookingStage;

  @ApiPropertyOptional({ description: 'Only bookings starting on/after this date' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'Only bookings starting on/before this date' })
  @IsOptional()
  @IsDateString()
  to?: string;
}
