import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsUUID } from 'class-validator';

export class BookingAvailabilityQueryDto {
  @ApiProperty()
  @IsUUID()
  listingId: string;

  @ApiProperty()
  @IsDateString()
  from: string;

  @ApiProperty()
  @IsDateString()
  to: string;
}
