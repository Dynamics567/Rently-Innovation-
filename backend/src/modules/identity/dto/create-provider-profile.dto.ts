import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateProviderProfileDto {
  @ApiPropertyOptional({ description: 'Omit for an individual provider (not a registered business)' })
  @IsOptional()
  @IsString()
  businessName?: string;

  @ApiPropertyOptional({ description: 'CAC registration number, if applicable' })
  @IsOptional()
  @IsString()
  businessRegistrationNo?: string;
}
