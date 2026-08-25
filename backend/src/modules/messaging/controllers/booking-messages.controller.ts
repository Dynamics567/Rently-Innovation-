import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CheckPolicies } from '@common/decorators/check-policies.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AuthenticatedUser } from '@modules/identity/strategies/jwt.strategy';
import { MessagingService } from '../services/messaging.service';
import { SendMessageDto } from '../dto/send-message.dto';
import { IsMessagingBookingPartyPolicy } from '../policies/is-messaging-booking-party.policy';

@ApiTags('messaging')
@ApiBearerAuth()
@Controller('bookings/:bookingId/messages')
export class BookingMessagesController {
  constructor(private readonly messagingService: MessagingService) {}

  @CheckPolicies(IsMessagingBookingPartyPolicy)
  @Get()
  async list(@Param('bookingId') bookingId: string) {
    return this.messagingService.listMessages(bookingId);
  }

  @CheckPolicies(IsMessagingBookingPartyPolicy)
  @Post()
  async send(
    @Param('bookingId') bookingId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SendMessageDto,
  ) {
    return this.messagingService.sendMessage(bookingId, user.id, dto.body);
  }

  @CheckPolicies(IsMessagingBookingPartyPolicy)
  @Post('read')
  async markRead(@Param('bookingId') bookingId: string, @CurrentUser() user: AuthenticatedUser) {
    await this.messagingService.markRead(bookingId, user.id);
    return { success: true };
  }
}
