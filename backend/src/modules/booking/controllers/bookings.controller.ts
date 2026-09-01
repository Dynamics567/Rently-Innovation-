import { Body, Controller, Get, Headers, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Public } from '@common/decorators/public.decorator';
import { Idempotent } from '@common/decorators/idempotent.decorator';
import { CheckPolicies } from '@common/decorators/check-policies.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AuthenticatedUser } from '@modules/identity/strategies/jwt.strategy';
import { ProviderProfileService } from '@modules/identity/services/provider-profile.service';
import { ListingsService } from '@modules/catalog/services/listings.service';
import { BookingService } from '../services/booking.service';
import { DisputeService } from '../services/dispute.service';
import { CreateBookingDto } from '../dto/create-booking.dto';
import { QueryBookingsDto } from '../dto/query-bookings.dto';
import { RecordInspectionDto } from '../dto/record-inspection.dto';
import { BookingAvailabilityQueryDto } from '../dto/booking-availability-query.dto';
import { IsBookingProviderPolicy } from '../policies/is-booking-provider.policy';
import { IsBookingPartyPolicy } from '../policies/is-booking-party.policy';

@ApiTags('bookings')
@ApiBearerAuth()
@Controller('bookings')
export class BookingsController {
  constructor(
    private readonly bookingService: BookingService,
    private readonly disputeService: DisputeService,
    private readonly listingsService: ListingsService,
    private readonly providerProfileService: ProviderProfileService,
  ) {}

  @Idempotent()
  @Post()
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateBookingDto,
    @Headers('idempotency-key') idempotencyKey: string,
  ) {
    return this.bookingService.create(user.id, dto, idempotencyKey);
  }

  @Public()
  @Get('availability')
  async availability(@Query() query: BookingAvailabilityQueryDto) {
    return this.bookingService.getAvailableQuantity(
      query.listingId,
      new Date(query.from),
      new Date(query.to),
    );
  }

  @Get()
  async search(@CurrentUser() user: AuthenticatedUser, @Query() query: QueryBookingsDto) {
    if (query.role === 'provider') {
      const profile = await this.providerProfileService.getByUserId(user.id);
      const listings = await this.listingsService.searchOwn({ providerId: profile.id, limit: 100 });
      const listingIds = listings.data.map((l) => l.id);
      return this.bookingService.searchAsProvider(listingIds, query);
    }
    return this.bookingService.searchAsRenter(user.id, query);
  }

  @CheckPolicies(IsBookingPartyPolicy)
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const booking = await this.bookingService.findByIdOrFail(id);
    const history = await this.bookingService.getHistory(id);
    return { ...booking, history };
  }

  @CheckPolicies(IsBookingProviderPolicy)
  @Post(':id/approve')
  async approve(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.bookingService.approve(id, user.id);
  }

  @CheckPolicies(IsBookingProviderPolicy)
  @Post(':id/decline')
  async decline(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body('reason') reason?: string,
  ) {
    return this.bookingService.decline(id, user.id, reason);
  }

  @CheckPolicies(IsBookingPartyPolicy)
  @Get(':id/cancellation-preview')
  async previewCancellation(@Param('id') id: string) {
    return this.bookingService.previewCancellationRefund(id);
  }

  @CheckPolicies(IsBookingPartyPolicy)
  @Post(':id/cancel')
  async cancel(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body('reason') reason?: string,
  ) {
    return this.bookingService.cancel(id, user.id, reason);
  }

  @CheckPolicies(IsBookingProviderPolicy)
  @Post(':id/confirm-handover')
  async confirmHandover(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.bookingService.confirmHandover(id, user.id);
  }

  @CheckPolicies(IsBookingProviderPolicy)
  @Post(':id/schedule-return')
  async scheduleReturn(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.bookingService.scheduleReturn(id, user.id);
  }

  @CheckPolicies(IsBookingProviderPolicy)
  @Post(':id/confirm-return')
  async confirmReturn(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.bookingService.confirmReturn(id, user.id);
  }

  @CheckPolicies(IsBookingProviderPolicy)
  @Post(':id/inspect')
  async inspect(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RecordInspectionDto,
  ) {
    return this.bookingService.recordInspection(id, user.id, dto);
  }

  /** @deprecated Use POST :id/inspect with {damageFound:false} — kept as a backward-compatible alias. */
  @CheckPolicies(IsBookingProviderPolicy)
  @Post(':id/release-deposit')
  async releaseDeposit(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.bookingService.releaseDeposit(id, user.id);
  }

  /**
   * Lets a renter/provider look up the dispute on their own booking without
   * already knowing its id — DisputesController's routes are all keyed by
   * dispute id, which a renter has no way to discover otherwise (there's no
   * "my disputes" list endpoint, and the admin list is admin-only).
   */
  @CheckPolicies(IsBookingPartyPolicy)
  @Get(':id/dispute')
  async getDispute(@Param('id') id: string) {
    return this.disputeService.findByBooking(id);
  }
}
