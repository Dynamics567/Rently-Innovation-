import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import {
  BookingMode,
  CancellationPolicy,
  ListingCondition,
  PriceUnit,
} from '../enums/listing.enums';

export class CreateListingDto {
  @ApiProperty()
  @IsUUID()
  categoryId: string;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiPropertyOptional({
    description: "Category-specific fields, validated against the category's attribute schema",
  })
  @IsOptional()
  @IsObject()
  attributes?: Record<string, unknown>;

  @ApiProperty({ description: 'Amount in kobo (integer minor units)' })
  @IsInt()
  @Min(0)
  priceMinor: number;

  @ApiProperty({ enum: PriceUnit })
  @IsEnum(PriceUnit)
  priceUnit: PriceUnit;

  @ApiPropertyOptional({ description: 'Amount in kobo' })
  @IsOptional()
  @IsInt()
  @Min(0)
  depositMinor?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  lat?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  lng?: number;

  @ApiProperty({ description: 'Display string, e.g. "Lekki Phase 1, Lagos"' })
  @IsString()
  locationText: string;

  @ApiPropertyOptional({ enum: ListingCondition, default: ListingCondition.GOOD })
  @IsOptional()
  @IsEnum(ListingCondition)
  condition?: ListingCondition;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  minDuration?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  maxDuration?: number;

  @ApiPropertyOptional({ enum: CancellationPolicy, default: CancellationPolicy.MODERATE })
  @IsOptional()
  @IsEnum(CancellationPolicy)
  cancellationPolicy?: CancellationPolicy;

  @ApiPropertyOptional({ enum: BookingMode, default: BookingMode.REQUEST })
  @IsOptional()
  @IsEnum(BookingMode)
  bookingMode?: BookingMode;
}
