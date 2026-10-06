import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '@common/decorators/roles.decorator';
import { UserRole } from '@modules/identity/enums/user-role.enum';
import { BookingService } from '../services/booking.service';
import { QueryAdminBookingsDto } from '../dto/query-admin-bookings.dto';

/**
 * Platform-wide bookings view — the single highest-leverage gap found in the
 * admin audit: BookingsController only ever serves a renter's or a
 * provider's own bookings, so nothing today lets an admin see the
 * marketplace's bookings as a whole. "Returns" in the admin nav is this same
 * list pre-filtered to stage=returnsched|returned|inspected, not a separate
 * screen or entity.
 */
@ApiTags('admin')
@ApiBearerAuth()
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Controller('admin/bookings')
export class AdminBookingsController {
  constructor(private readonly bookingService: BookingService) {}

  @Get()
  async search(@Query() query: QueryAdminBookingsDto) {
    return this.bookingService.searchAsAdmin(query);
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.bookingService.getDetailForAdmin(id);
  }
}
