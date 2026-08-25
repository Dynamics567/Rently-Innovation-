import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class RespondToDisputeDto {
  @ApiProperty({ enum: ['accept', 'reject'] })
  @IsIn(['accept', 'reject'])
  decision: 'accept' | 'reject';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}
