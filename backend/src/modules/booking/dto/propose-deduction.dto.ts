import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class ProposeDeductionDto {
  @ApiProperty({ description: 'Amount in kobo to deduct from the deposit' })
  @IsInt()
  @Min(0)
  amountMinor: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}
