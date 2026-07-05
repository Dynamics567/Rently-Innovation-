import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Public } from '@common/decorators/public.decorator';
import { ProviderProfileService } from '../services/provider-profile.service';
import { CreateProviderProfileDto } from '../dto/create-provider-profile.dto';
import { AuthenticatedUser } from '../strategies/jwt.strategy';

@ApiTags('providers')
@Controller('providers')
export class ProvidersController {
  constructor(private readonly providerService: ProviderProfileService) {}

  @Post('profile')
  @ApiBearerAuth()
  async createProfile(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateProviderProfileDto) {
    return this.providerService.createProfile(user.id, dto);
  }

  @Get('me')
  @ApiBearerAuth()
  async getMyProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.providerService.getByUserId(user.id);
  }

  @Public()
  @Get(':id')
  async getPublicProfile() {
    // Public provider profile (name, rating, verified badge, listing count)
    // — intentionally left as a stub here. It's served by the Catalog
    // module once listings exist to aggregate against, not by Identity.
    return { message: 'See CatalogModule — public provider profile aggregates listing + review data.' };
  }
}
