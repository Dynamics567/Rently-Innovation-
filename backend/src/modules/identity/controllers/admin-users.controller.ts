import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';
import { Roles } from '@common/decorators/roles.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { UserRole } from '../enums/user-role.enum';
import { UsersService } from '../services/users.service';
import { SetUserRolesDto } from '../dto/set-user-roles.dto';
import { AuthenticatedUser } from '../strategies/jwt.strategy';

class LookupUserQueryDto {
  @IsEmail()
  email: string;
}

/**
 * SUPER_ADMIN only, deliberately stricter than AdminProvidersController/
 * AdminListingsController (ADMIN or SUPER_ADMIN) — granting someone else
 * admin power is a bigger blast radius than approving a listing, so it
 * requires the higher tier. This is the only path left for creating a new
 * admin now that public signup can't (see SignupDto.SELF_SERVICE_ROLES);
 * the very first super admin is bootstrapped separately via
 * database/seeds/promote-user.ts, since this endpoint needs one to exist
 * before it can be called at all.
 */
@ApiTags('admin')
@ApiBearerAuth()
@Roles(UserRole.SUPER_ADMIN)
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('lookup')
  async lookup(@Query() query: LookupUserQueryDto) {
    return this.usersService.getByEmail(query.email);
  }

  @Patch(':id/roles')
  async setRoles(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetUserRolesDto,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    return this.usersService.setRoles(id, dto.roles, admin.id);
  }
}
