import { Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '@common/decorators/roles.decorator';
import { UserRole } from '@modules/identity/enums/user-role.enum';
import { ListingsService } from '../services/listings.service';

/**
 * Every route here requires the ADMIN or SUPER_ADMIN role, same convention
 * as AdminProvidersController (identity module). A listing sits in
 * `pending_review` after a provider publishes it (ListingsService.publish())
 * and only reaches `live` through approve() here — this is that flow's
 * HTTP surface, previously reachable only via approve()/reject() on
 * ListingsController with no way to discover *which* listings needed it.
 */
@ApiTags('admin')
@ApiBearerAuth()
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Controller('admin/listings')
export class AdminListingsController {
  constructor(private readonly listingsService: ListingsService) {}

  @Get('moderation-queue')
  async moderationQueue() {
    return this.listingsService.getModerationQueue();
  }

  @Post(':id/approve')
  async approve(@Param('id') id: string) {
    return this.listingsService.approve(id);
  }

  @Post(':id/reject')
  async reject(@Param('id') id: string) {
    return this.listingsService.reject(id);
  }
}
