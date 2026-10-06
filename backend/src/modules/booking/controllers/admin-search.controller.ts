import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';
import { Roles } from '@common/decorators/roles.decorator';
import { UserRole } from '@modules/identity/enums/user-role.enum';
import { UsersService } from '@modules/identity/services/users.service';
import { ProviderProfileService } from '@modules/identity/services/provider-profile.service';
import { ListingsService } from '@modules/catalog/services/listings.service';

class SearchQueryDto {
  @IsString()
  @MinLength(2)
  q: string;
}

const TOP_N = 5;

/**
 * Global command-search (Cmd+K) aggregator. Lives in BookingModule — not
 * because this is booking-specific, but because BookingModule is the only
 * existing module that already imports both IdentityModule and
 * CatalogModule (for BookingService's own cross-module needs), so
 * UsersService/ProviderProfileService/ListingsService are already
 * available here without introducing a new module or an import cycle.
 *
 * Bookings are deliberately left out of the fan-out: admin booking search
 * has no text-matching capability yet (BookingRepository.search() filters
 * by status/stage/date only), so returning "most recent N bookings"
 * regardless of the typed query would be actively misleading for a search
 * feature, not just incomplete. A booking is still reachable from here —
 * search the renter or the listing, open its record-detail drawer, and the
 * booking shows up on the Activity tab. Real booking-reference-number
 * search is a natural follow-up once the Bookings view ships.
 */
@ApiTags('admin')
@ApiBearerAuth()
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Controller('admin/search')
export class AdminSearchController {
  constructor(
    private readonly usersService: UsersService,
    private readonly providerProfileService: ProviderProfileService,
    private readonly listingsService: ListingsService,
  ) {}

  @Get()
  async search(@Query() query: SearchQueryDto) {
    const [customers, providers, listings] = await Promise.all([
      this.usersService.searchForAdmin(query.q, undefined, TOP_N).catch(() => ({ data: [] })),
      this.providerProfileService.searchForAdmin(query.q, undefined, TOP_N).catch(() => ({ data: [] })),
      this.listingsService.searchForAdmin({ q: query.q, limit: TOP_N } as any).catch(() => ({ data: [] })),
    ]);
    return {
      customers: customers.data,
      providers: providers.data,
      listings: listings.data,
    };
  }
}
