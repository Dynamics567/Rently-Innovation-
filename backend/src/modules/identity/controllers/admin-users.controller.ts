import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';
import { Roles } from '@common/decorators/roles.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { UserRole } from '../enums/user-role.enum';
import { UsersService } from '../services/users.service';
import { SetUserRolesDto } from '../dto/set-user-roles.dto';
import { SetUserStatusDto } from '../dto/set-user-status.dto';
import { QueryAdminUsersDto } from '../dto/query-admin-users.dto';
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

  /**
   * Customers view: search/detail/suspend are routine operational actions
   * (same tier as approving a listing or verifying a provider), unlike
   * role-granting above — so these are deliberately loosened to ADMIN or
   * SUPER_ADMIN via a method-level @Roles() override of this controller's
   * SUPER_ADMIN-only default (RolesGuard checks the handler before the
   * class, via Reflector.getAllAndOverride).
   */
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get()
  async search(@Query() query: QueryAdminUsersDto) {
    return this.usersService.searchForAdmin(query.search, query.cursor, query.limit);
  }

  /** Overview's "total users" stat — registered before :id so "stats" is never parsed as a user id. */
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('stats')
  async stats() {
    return this.usersService.getStats();
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('analytics/signups')
  async signupTrend(@Query('days') days?: string) {
    return this.usersService.getSignupTrend(days ? Number(days) : 30);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.getById(id);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post(':id/status')
  async setStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetUserStatusDto,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    return this.usersService.setStatus(id, dto.status, admin.id, dto.reason);
  }

  /**
   * Soft-deletes an account (e.g. test/junk data cleanup) — reversible via
   * deleted_at, audit-logged. Deliberately left at this controller's
   * SUPER_ADMIN-only default rather than loosened to ADMIN like the routes
   * above: removing an account outright is a bigger blast radius than a
   * reversible suspend.
   */
  @Delete(':id')
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() admin: AuthenticatedUser) {
    await this.usersService.removeAsAdmin(id, admin.id);
    return { removed: true };
  }
}
