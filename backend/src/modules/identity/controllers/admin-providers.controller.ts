import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';
import { Roles } from '@common/decorators/roles.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { UserRole } from '../enums/user-role.enum';
import { ProviderProfileService } from '../services/provider-profile.service';
import { AuthenticatedUser } from '../strategies/jwt.strategy';

class RejectVerificationDto {
  @IsString()
  @MinLength(5)
  reason: string;
}

/**
 * Every route here requires the ADMIN or SUPER_ADMIN role — enforced by
 * RolesGuard reading the class-level @Roles() decorator, not by an
 * `if (user.role !== 'admin')` check duplicated in every method. PRD §8
 * grants Admin "approve/verify providers"; this controller is that
 * capability's HTTP surface. Business logic still lives in
 * ProviderProfileService — this stays a thin routing layer.
 */
@ApiTags('admin')
@ApiBearerAuth()
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Controller('admin/providers')
export class AdminProvidersController {
  constructor(private readonly providerService: ProviderProfileService) {}

  @Get('verification-queue')
  async verificationQueue() {
    return this.providerService.getVerificationQueue();
  }

  @Post(':id/verify')
  async verify(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() admin: AuthenticatedUser) {
    return this.providerService.approveVerification(id, admin.id);
  }

  @Post(':id/reject')
  async reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectVerificationDto,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    return this.providerService.rejectVerification(id, admin.id, dto.reason);
  }
}
