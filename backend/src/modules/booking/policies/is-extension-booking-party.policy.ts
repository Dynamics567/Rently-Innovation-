import { ExecutionContext, Injectable } from '@nestjs/common';
import { PolicyHandler } from '@common/policies/policy-handler.interface';
import { ProviderProfileService } from '@modules/identity/services/provider-profile.service';
import { UserRole } from '@modules/identity/enums/user-role.enum';
import { ListingsService } from '@modules/catalog/services/listings.service';
import { BookingService } from '../services/booking.service';

/**
 * Same shape as IsBookingPartyPolicy, but resolves the booking from
 * `:bookingId` — every extension-request route is nested under
 * `bookings/:bookingId/extension-requests`, so the booking id is always in
 * the URL directly rather than needing a lookup through an extension
 * request row first.
 */
@Injectable()
export class IsExtensionBookingPartyPolicy implements PolicyHandler {
  constructor(
    private readonly bookingService: BookingService,
    private readonly listingsService: ListingsService,
    private readonly providerProfileService: ProviderProfileService,
  ) {}

  async handle(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const { user } = request;
    if (!user) return false;
    if (user.roles.includes(UserRole.ADMIN) || user.roles.includes(UserRole.SUPER_ADMIN)) {
      return true;
    }

    const booking = await this.bookingService.findByIdOrFail(request.params.bookingId).catch(() => null);
    if (!booking) return false;
    if (booking.renterId === user.id) return true;

    const listing = await this.listingsService.findByIdOrFail(booking.listingId);
    const profile = await this.providerProfileService.getByUserId(user.id).catch(() => null);
    return profile?.id === listing.providerId;
  }
}
