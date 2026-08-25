import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ListingCondition } from '../enums/listing.enums';

export class CreateAssetDto {
  @ApiProperty({ description: 'e.g. "Unit 1" or a serial number' })
  @IsString()
  label: string;

  @ApiPropertyOptional({ enum: ListingCondition, default: ListingCondition.GOOD })
  @IsOptional()
  @IsEnum(ListingCondition)
  condition?: ListingCondition;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
