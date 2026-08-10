import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsObject, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class CreateCategoryDto {
  @ApiPropertyOptional({ description: 'Parent category id, for subcategories' })
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  slug: string;

  @ApiPropertyOptional({ description: "JSON Schema for this category's custom listing fields" })
  @IsOptional()
  @IsObject()
  attributeSchema?: Record<string, unknown>;

  @ApiPropertyOptional({ default: 500, description: 'Basis points, e.g. 500 = 5%' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10000)
  commissionRateBps?: number;
}
