import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CursorPaginationDto } from '@common/dto/cursor-pagination.dto';

export type ListingSort = 'recommended' | 'price_asc' | 'price_desc' | 'rating';

export class QueryListingsDto extends CursorPaginationDto {
  @ApiPropertyOptional({ description: 'Category slug' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Free-text search over title/description/location' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  priceMin?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  priceMax?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  instantOnly?: boolean;

  @ApiPropertyOptional({ minimum: 0, maximum: 5 })
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  @Max(5)
  ratingMin?: number;

  @ApiPropertyOptional({ enum: ['recommended', 'price_asc', 'price_desc', 'rating'] })
  @IsOptional()
  @IsIn(['recommended', 'price_asc', 'price_desc', 'rating'])
  sort?: ListingSort;

  @ApiPropertyOptional({ description: 'Only listings owned by this provider profile id' })
  @IsOptional()
  @IsUUID()
  providerId?: string;
}
