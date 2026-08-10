import { ExecutionContext, Injectable } from '@nestjs/common';
import { PolicyHandler } from '@common/policies/policy-handler.interface';
import { ProviderProfileService } from '@modules/identity/services/provider-profile.service';
import { UserRole } from '@modules/identity/enums/user-role.enum';
import { ListingsService } from '@modules/catalog/services/listings.service';
import { BookingService } from '../services/booking.service';

/**
 * The provider who owns the booked listing — resolved booking -> listing ->
 * provider profile, one hop further than IsListingOwnerPolicy. Depends only
 * on exported services (BookingService, ListingsService,
 * ProviderProfileService) — see IsListingOwnerPolicy's doc comment for why
 * a module-internal repository doesn't resolve here.
 */
@Injectable()
export class IsBookingProviderPolicy implements PolicyHandler {
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

    const booking = await this.bookingService.findByIdOrFail(request.params.id).catch(() => null);
    if (!booking) return false;

    const listing = await this.listingsService.findByIdOrFail(booking.listingId);
    const profile = await this.providerProfileService.getByUserId(user.id).catch(() => null);
    return profile?.id === listing.providerId;
  }
}
