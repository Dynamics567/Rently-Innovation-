import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, Min } from 'class-validator';

export class DateRangeQueryDto {
  @ApiProperty()
  @IsDateString()
  from: string;

  @ApiProperty()
  @IsDateString()
  to: string;

  @ApiPropertyOptional({ description: 'Units requested, for a bulk-quantity listing.', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity?: number;
}
