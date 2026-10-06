import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { UserAccountStatus } from '../enums/verification-status.enum';

export class SetUserStatusDto {
  @ApiProperty({ enum: UserAccountStatus })
  @IsEnum(UserAccountStatus)
  status: UserAccountStatus;

  @ApiPropertyOptional({ description: 'Required unless reinstating to active.' })
  @IsOptional()
  @IsString()
  reason?: string;
}
