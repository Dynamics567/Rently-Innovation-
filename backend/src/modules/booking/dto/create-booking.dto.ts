import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, IsUUID, Min } from 'class-validator';

export class CreateBookingDto {
  @ApiProperty()
  @IsUUID()
  listingId: string;

  @ApiProperty()
  @IsDateString()
  from: string;

  @ApiProperty()
  @IsDateString()
  to: string;

  @ApiPropertyOptional({ description: 'How many units to reserve, for a bulk-quantity listing (e.g. 20 chairs).', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;
}
