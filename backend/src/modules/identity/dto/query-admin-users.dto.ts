import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { CursorPaginationDto } from '@common/dto/cursor-pagination.dto';

export class QueryAdminUsersDto extends CursorPaginationDto {
  @ApiPropertyOptional({ description: 'Partial match against full name or email' })
  @IsOptional()
  @IsString()
  search?: string;
}
