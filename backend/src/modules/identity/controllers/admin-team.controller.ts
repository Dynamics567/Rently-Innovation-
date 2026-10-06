import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsEmail, IsIn } from 'class-validator';
import { Roles } from '@common/decorators/roles.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { UserRole } from '../enums/user-role.enum';
import { UsersService } from '../services/users.service';
import { AuthenticatedUser } from '../strategies/jwt.strategy';

const INVITABLE_ROLES = [UserRole.ADMIN, UserRole.SUPER_ADMIN] as const;

class InviteAdminDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty({ enum: INVITABLE_ROLES })
  @IsIn(INVITABLE_ROLES)
  role: UserRole;
}

/**
 * Separate from AdminUsersController (which is Customers-view CRUD over
 * every account) — this is specifically "who has admin access, and how do
 * I grant more of it," the role-management visibility the admin redesign
 * never surfaced on its own. SUPER_ADMIN-only throughout, same tier as
 * role-granting everywhere else in this codebase.
 */
@ApiTags('admin')
@ApiBearerAuth()
@Roles(UserRole.SUPER_ADMIN)
@Controller('admin/team')
export class AdminTeamController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async list() {
    return this.usersService.listAdminTeam();
  }

  @Post('invite')
  async invite(@Body() dto: InviteAdminDto, @CurrentUser() admin: AuthenticatedUser) {
    return this.usersService.inviteAdmin(dto.email, dto.role, admin.id);
  }

  @Post('invites/:inviteId/revoke')
  async revoke(@Param('inviteId', ParseUUIDPipe) inviteId: string, @CurrentUser() admin: AuthenticatedUser) {
    return this.usersService.revokeInvite(inviteId, admin.id);
  }
}
