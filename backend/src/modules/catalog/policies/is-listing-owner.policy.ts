import { ExecutionContext, Injectable } from '@nestjs/common';
import { PolicyHandler } from '@common/policies/policy-handler.interface';
import { ProviderProfileService } from '@modules/identity/services/provider-profile.service';
import { UserRole } from '@modules/identity/enums/user-role.enum';
import { ListingsService } from '../services/listings.service';

/**
 * "A Provider may edit/pause/publish/photograph this listing only if they
 * own it" — docs/API_DESIGN.md marks PATCH/DELETE /listings/:id "[Provider,
 * owner only]". Admins bypass ownership, same convention as
 * IsSelfOrAdminPolicy in Identity.
 *
 * Depends on ListingsService (exported), never ListingRepository directly:
 * PoliciesGuard instantiates policies via `moduleRef.create()`, which only
 * resolves dependencies visible from AppModule's context — i.e. a module's
 * exports, never its internal providers. Injecting the repository here
 * throws "Nest can't resolve dependencies" at the first real request,
 * invisible to unit tests since they construct the policy directly.
 */
@Injectable()
export class IsListingOwnerPolicy implements PolicyHandler {
  constructor(
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

    const listingId = request.params.id;
    const listing = await this.listingsService.findByIdOrFail(listingId).catch(() => null);
    if (!listing) return false;

    const profile = await this.providerProfileService.getByUserId(user.id).catch(() => null);
    return profile?.id === listing.providerId;
  }
}
