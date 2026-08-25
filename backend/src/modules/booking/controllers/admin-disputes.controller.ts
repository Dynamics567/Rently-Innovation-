import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '@common/decorators/roles.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { UserRole } from '@modules/identity/enums/user-role.enum';
import { AuthenticatedUser } from '@modules/identity/strategies/jwt.strategy';
import { DisputeService } from '../services/dispute.service';
import { AdminResolveDisputeDto } from '../dto/admin-resolve-dispute.dto';
import { DisputeStatus } from '../enums/dispute-status.enum';

@ApiTags('admin')
@ApiBearerAuth()
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Controller('admin/disputes')
export class AdminDisputesController {
  constructor(private readonly disputeService: DisputeService) {}

  @Get()
  async list(@Query('status') status?: DisputeStatus) {
    return this.disputeService.listAll(status);
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.disputeService.findByIdOrFail(id);
  }

  @Post(':id/resolve')
  async resolve(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() admin: AuthenticatedUser,
    @Body() dto: AdminResolveDisputeDto,
  ) {
    return this.disputeService.adminResolve(id, admin.id, dto.finalDeductionMinor, dto.note);
  }
}
