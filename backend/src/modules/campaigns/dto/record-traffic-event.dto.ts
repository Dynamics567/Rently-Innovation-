import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { CampaignTrafficEventType } from '../enums/campaign-traffic-event-type.enum';

export class RecordTrafficEventDto {
  @ApiProperty({ enum: CampaignTrafficEventType })
  @IsEnum(CampaignTrafficEventType)
  type: CampaignTrafficEventType;

  @ApiProperty()
  @IsString()
  @MaxLength(200)
  path: string;

  @ApiProperty({
    description:
      "A per-tab sessionStorage id, so a reload never double-counts the same tab's view.",
  })
  @IsString()
  @MaxLength(100)
  sessionKey: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  referralCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  utmSource?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  utmMedium?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  utmCampaign?: string;

  @ApiPropertyOptional({
    description: 'Host only, never the full referrer URL — see CampaignTrafficEvent.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  referrerHost?: string;
}
