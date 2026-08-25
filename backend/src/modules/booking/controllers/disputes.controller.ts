import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CheckPolicies } from '@common/decorators/check-policies.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AuthenticatedUser } from '@modules/identity/strategies/jwt.strategy';
import { DisputeService } from '../services/dispute.service';
import { ProposeDeductionDto } from '../dto/propose-deduction.dto';
import { RespondToDisputeDto } from '../dto/respond-to-dispute.dto';
import { IsDisputePartyPolicy } from '../policies/is-dispute-party.policy';

@ApiTags('disputes')
@ApiBearerAuth()
@Controller('disputes')
export class DisputesController {
  constructor(private readonly disputeService: DisputeService) {}

  @CheckPolicies(IsDisputePartyPolicy)
  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.disputeService.findByIdOrFail(id);
  }

  @CheckPolicies(IsDisputePartyPolicy)
  @Post(':id/propose')
  async propose(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ProposeDeductionDto,
  ) {
    return this.disputeService.proposeDeduction(id, user.id, dto.amountMinor, dto.note);
  }

  @CheckPolicies(IsDisputePartyPolicy)
  @Post(':id/respond')
  async respond(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RespondToDisputeDto,
  ) {
    return this.disputeService.respondToProposal(id, user.id, dto.decision, dto.note);
  }
}
