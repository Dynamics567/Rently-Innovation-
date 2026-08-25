import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Min, MinLength } from 'class-validator';

export class AdminResolveDisputeDto {
  @ApiProperty({ description: 'Amount in kobo to deduct from the deposit — 0 means release it in full' })
  @IsInt()
  @Min(0)
  finalDeductionMinor: number;

  @ApiProperty()
  @IsString()
  @MinLength(5)
  note: string;
}
