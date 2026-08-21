import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { randomUUID } from 'crypto';
import { Public } from '@common/decorators/public.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { CheckPolicies } from '@common/decorators/check-policies.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { STORAGE_PORT, StoragePort } from '@common/storage/storage.port';
import { AuthenticatedUser } from '@modules/identity/strategies/jwt.strategy';
import { ProviderProfileService } from '@modules/identity/services/provider-profile.service';
import { UserRole } from '@modules/identity/enums/user-role.enum';
import { ListingsService } from '../services/listings.service';
import { AvailabilityService } from '../services/availability.service';
import { CreateListingDto } from '../dto/create-listing.dto';
import { UpdateListingDto } from '../dto/update-listing.dto';
import { QueryListingsDto } from '../dto/query-listings.dto';
import { CreateAvailabilityBlockDto } from '../dto/create-availability-block.dto';
import { DateRangeQueryDto } from '../dto/date-range-query.dto';
import { IsListingOwnerPolicy } from '../policies/is-listing-owner.policy';

@ApiTags('listings')
@Controller('listings')
export class ListingsController {
  constructor(
    private readonly listingsService: ListingsService,
    private readonly availabilityService: AvailabilityService,
    private readonly providerProfileService: ProviderProfileService,
    @Inject(STORAGE_PORT) private readonly storage: StoragePort,
  ) {}

  @Public()
  @Get()
  async search(@Query() query: QueryListingsDto) {
    return this.listingsService.search(query);
  }

  @ApiBearerAuth()
  @Get('mine')
  async findMine(@CurrentUser() user: AuthenticatedUser, @Query() query: QueryListingsDto) {
    const profile = await this.providerProfileService.getByUserId(user.id);
    return this.listingsService.searchOwn({ ...query, providerId: profile.id });
  }

  // Public and LIVE-only, deliberately with no "owner can preview their own
  // draft" exception: @Public() routes never run the JWT strategy (see
  // JwtAuthGuard), so request.user is never populated here regardless of
  // whether a token was sent — there's no reliable way to know who's asking.
  // A provider previewing their own non-live listing uses GET /listings/mine.
  @Public()
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.listingsService.getDetail(id);
  }

  @Roles(UserRole.PROVIDER)
  @ApiBearerAuth()
  @Post()
  async create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateListingDto) {
    const profile = await this.providerProfileService.getByUserId(user.id);
    return this.listingsService.create(profile.id, dto);
  }

  @CheckPolicies(IsListingOwnerPolicy)
  @ApiBearerAuth()
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateListingDto) {
    return this.listingsService.update(id, dto);
  }

  @CheckPolicies(IsListingOwnerPolicy)
  @ApiBearerAuth()
  @Post(':id/publish')
  async publish(@Param('id') id: string) {
    return this.listingsService.publish(id);
  }

  @CheckPolicies(IsListingOwnerPolicy)
  @ApiBearerAuth()
  @Post(':id/pause')
  async pause(@Param('id') id: string) {
    return this.listingsService.pause(id);
  }

  @CheckPolicies(IsListingOwnerPolicy)
  @ApiBearerAuth()
  @Post(':id/duplicate')
  async duplicate(@Param('id') id: string) {
    return this.listingsService.duplicate(id);
  }

  @CheckPolicies(IsListingOwnerPolicy)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  @Post(':id/photos')
  async uploadPhoto(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    const key = `listings/${id}/${randomUUID()}`;
    await this.storage.upload({ key, body: file.buffer, contentType: file.mimetype });
    await this.listingsService.addPhoto(id, key);
    return { key, url: await this.storage.getUrl(key) };
  }

  @Public()
  @Get(':id/quote')
  async quote(@Param('id') id: string, @Query() range: DateRangeQueryDto) {
    return this.listingsService.getQuote(id, new Date(range.from), new Date(range.to));
  }

  @Public()
  @Get(':id/availability')
  async availability(@Param('id') id: string, @Query() range: DateRangeQueryDto) {
    return this.availabilityService.getBlocksInRange(id, new Date(range.from), new Date(range.to));
  }

  @CheckPolicies(IsListingOwnerPolicy)
  @ApiBearerAuth()
  @Post(':id/availability-blocks')
  async createBlock(@Param('id') id: string, @Body() dto: CreateAvailabilityBlockDto) {
    return this.availabilityService.createBlock(
      id,
      new Date(dto.from),
      new Date(dto.to),
      dto.reason,
    );
  }
}
