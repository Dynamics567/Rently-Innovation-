import { Body, Controller, Get, Param, ParseUUIDPipe, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '@common/decorators/roles.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { UserRole } from '../enums/user-role.enum';
import { PermissionsService } from '../services/permissions.service';
import { SetRolePermissionsDto } from '../dto/set-role-permissions.dto';
import { AuthenticatedUser } from '../strategies/jwt.strategy';

/**
 * The Permissions matrix's backend — SUPER_ADMIN only, same tier as
 * AdminTeamController: editing what a role can do is the same blast radius
 * as deciding who gets admin access at all.
 */
@ApiTags('admin')
@ApiBearerAuth()
@Roles(UserRole.SUPER_ADMIN)
@Controller('admin')
export class AdminPermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get('permissions')
  async listPermissions() {
    return this.permissionsService.listPermissions();
  }

  @Get('roles')
  async listRoles() {
    return this.permissionsService.listRolesWithPermissions();
  }

  @Patch('roles/:id/permissions')
  async setRolePermissions(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetRolePermissionsDto,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    await this.permissionsService.setRolePermissions(id, dto.permissionKeys, admin.id);
    return { updated: true };
  }
}
