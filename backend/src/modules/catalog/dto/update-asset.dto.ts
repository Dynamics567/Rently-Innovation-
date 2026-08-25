import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { AssetProviderStatus, ListingCondition } from '../enums/listing.enums';

export class UpdateAssetDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  label?: string;

  @ApiPropertyOptional({ enum: ListingCondition })
  @IsOptional()
  @IsEnum(ListingCondition)
  condition?: ListingCondition;

  @ApiPropertyOptional({ enum: AssetProviderStatus })
  @IsOptional()
  @IsEnum(AssetProviderStatus)
  providerStatus?: AssetProviderStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
