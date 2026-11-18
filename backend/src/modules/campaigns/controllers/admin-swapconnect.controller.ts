import { Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '@common/decorators/roles.decorator';
import { RequirePermission } from '@common/decorators/require-permission.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { UserRole } from '@modules/identity/enums/user-role.enum';
import { AuthenticatedUser } from '@modules/identity/strategies/jwt.strategy';
import { SwapConnectIntegrationService } from '../services/swapconnect-integration.service';

@ApiTags('admin')
@ApiBearerAuth()
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Controller('admin/campaigns/swapconnect')
export class AdminSwapConnectController {
  constructor(private readonly integrationService: SwapConnectIntegrationService) {}

  @Get('status')
  async status() {
    return this.integrationService.getStatus();
  }

  @RequirePermission('campaigns.manage')
  @Post('sync')
  async sync(@CurrentUser() admin: AuthenticatedUser) {
    return this.integrationService.sync(admin.id);
  }
}
