import { Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { CursorPaginationDto } from '@common/dto/cursor-pagination.dto';
import { AuthenticatedUser } from '@modules/identity/strategies/jwt.strategy';
import { NotificationsService } from '../services/notifications.service';

// Needs its own class-validator decorator, not just a type annotation --
// the global ValidationPipe runs with whitelist:true + forbidNonWhitelisted:true
// (main.ts), which 400s on any query property class-validator doesn't know
// about. See AdminAuditLogController's QueryAuditLogDto for the same fix.
class QueryNotificationsDto extends CursorPaginationDto {
  @ApiPropertyOptional({ enum: ['true', 'false'] })
  @IsOptional()
  @IsIn(['true', 'false'])
  unread?: string;
}

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser, @Query() query: QueryNotificationsDto) {
    return this.notificationsService.listForUser(user.id, {
      unread: query.unread === 'true',
      cursor: query.cursor,
      limit: query.limit,
    });
  }

  @Post(':id/read')
  async markRead(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.markRead(id, user.id);
  }

  @Post('read-all')
  async markAllRead(@CurrentUser() user: AuthenticatedUser) {
    await this.notificationsService.markAllRead(user.id);
    return { success: true };
  }
}
