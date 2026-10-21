import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { Roles } from '@common/decorators/roles.decorator';
import { CursorPaginationDto } from '@common/dto/cursor-pagination.dto';
import { UserRole } from '@modules/identity/enums/user-role.enum';
import { AuditLogService } from './audit-log.service';

// Fields need their own class-validator decorators, not just a type
// annotation -- the global ValidationPipe runs with whitelist:true +
// forbidNonWhitelisted:true (main.ts), which rejects any query property
// class-validator doesn't know about, decorator-less fields included.
class QueryAuditLogDto extends CursorPaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  entity_type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  entity_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  actor_id?: string;
}

@ApiTags('admin')
@ApiBearerAuth()
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Controller('admin/audit-log')
export class AdminAuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  async search(@Query() query: QueryAuditLogDto) {
    return this.auditLogService.search({
      entityType: query.entity_type,
      entityId: query.entity_id,
      actorId: query.actor_id,
      cursor: query.cursor,
      limit: query.limit,
    });
  }
}
