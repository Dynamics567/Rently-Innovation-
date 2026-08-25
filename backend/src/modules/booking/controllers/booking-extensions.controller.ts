import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CheckPolicies } from '@common/decorators/check-policies.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AuthenticatedUser } from '@modules/identity/strategies/jwt.strategy';
import { BookingService } from '../services/booking.service';
import { RequestExtensionDto } from '../dto/request-extension.dto';
import { IsExtensionBookingPartyPolicy } from '../policies/is-extension-booking-party.policy';
import { IsExtensionBookingProviderPolicy } from '../policies/is-extension-booking-provider.policy';

@ApiTags('bookings')
@ApiBearerAuth()
@Controller('bookings/:bookingId/extension-requests')
export class BookingExtensionsController {
  constructor(private readonly bookingService: BookingService) {}

  @CheckPolicies(IsExtensionBookingPartyPolicy)
  @Post()
  async request(
    @Param('bookingId', ParseUUIDPipe) bookingId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RequestExtensionDto,
  ) {
    return this.bookingService.requestExtension(bookingId, user.id, new Date(dto.newEndsAt));
  }

  @CheckPolicies(IsExtensionBookingPartyPolicy)
  @Get()
  async list(@Param('bookingId', ParseUUIDPipe) bookingId: string) {
    return this.bookingService.listExtensionRequestsForBooking(bookingId);
  }

  @CheckPolicies(IsExtensionBookingProviderPolicy)
  @Post(':id/approve')
  async approve(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.bookingService.approveExtension(id, user.id);
  }

  @CheckPolicies(IsExtensionBookingProviderPolicy)
  @Post(':id/decline')
  async decline(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body('reason') reason?: string,
  ) {
    return this.bookingService.declineExtension(id, user.id, reason);
  }

  @CheckPolicies(IsExtensionBookingPartyPolicy)
  @Post(':id/cancel')
  async cancel(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.bookingService.cancelExtensionRequest(id, user.id);
  }
}
