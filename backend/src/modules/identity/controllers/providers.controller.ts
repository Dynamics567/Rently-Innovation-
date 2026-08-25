import { Body, Controller, Get, Param, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Public } from '@common/decorators/public.decorator';
import { ProviderProfileService } from '../services/provider-profile.service';
import { VerificationDocumentsService } from '../services/verification-documents.service';
import { CreateProviderProfileDto } from '../dto/create-provider-profile.dto';
import { UploadVerificationDocumentDto } from '../dto/upload-verification-document.dto';
import { AuthenticatedUser } from '../strategies/jwt.strategy';

@ApiTags('providers')
@Controller('providers')
export class ProvidersController {
  constructor(
    private readonly providerService: ProviderProfileService,
    private readonly verificationDocumentsService: VerificationDocumentsService,
  ) {}

  @Post('profile')
  @ApiBearerAuth()
  async createProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateProviderProfileDto,
  ) {
    return this.providerService.createProfile(user.id, dto);
  }

  @Get('me')
  @ApiBearerAuth()
  async getMyProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.providerService.getByUserId(user.id);
  }

  @Public()
  @Get(':id')
  async getPublicProfile(@Param('id') id: string) {
    return this.providerService.getPublicProfile(id);
  }

  @Post('me/verification-documents')
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async uploadVerificationDocument(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UploadVerificationDocumentDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const profile = await this.providerService.getByUserId(user.id);
    return this.verificationDocumentsService.upload(profile.id, dto.docType, file);
  }

  @Get('me/verification-documents')
  @ApiBearerAuth()
  async listMyVerificationDocuments(@CurrentUser() user: AuthenticatedUser) {
    const profile = await this.providerService.getByUserId(user.id);
    return this.verificationDocumentsService.listForProvider(profile.id);
  }
}
