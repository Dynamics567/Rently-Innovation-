import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '@common/decorators/roles.decorator';
import { CursorPaginationDto } from '@common/dto/cursor-pagination.dto';
import { UserRole } from '@modules/identity/enums/user-role.enum';
import { AuditLogService } from './audit-log.service';

class QueryAuditLogDto extends CursorPaginationDto {
  entity_type?: string;
  entity_id?: string;
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
