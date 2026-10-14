import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class MarkSettlementPaidDto {
  @ApiProperty({ description: 'Free-text record of how this was actually paid, e.g. "Bank transfer, GTBank, ref #1234".' })
  @IsString()
  @MinLength(3)
  reference: string;
}
