import { ApiProperty } from '@nestjs/swagger';
import { IsDateString } from 'class-validator';

export class RequestExtensionDto {
  @ApiProperty()
  @IsDateString()
  newEndsAt: string;
}
