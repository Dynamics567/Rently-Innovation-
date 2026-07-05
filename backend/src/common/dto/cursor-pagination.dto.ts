import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Cursor pagination, not offset — see docs/API_DESIGN.md. Offset pagination
 * (`?page=2`) silently skips or duplicates rows on a table receiving
 * concurrent writes, which every browse/search endpoint in this system is.
 */
export class CursorPaginationDto {
  @ApiPropertyOptional({ description: 'Opaque cursor from a previous response\'s meta.nextCursor' })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}

export interface CursorPage<T> {
  data: T[];
  meta: {
    nextCursor: string | null;
    hasMore: boolean;
  };
}
