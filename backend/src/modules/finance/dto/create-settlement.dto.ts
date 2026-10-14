import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class CreateSettlementDto {
  @ApiProperty()
  @IsUUID()
  providerId: string;
}
