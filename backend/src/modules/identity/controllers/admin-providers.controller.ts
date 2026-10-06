import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';
import { CursorPaginationDto } from '@common/dto/cursor-pagination.dto';
import { Roles } from '@common/decorators/roles.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { UserRole } from '../enums/user-role.enum';
import { ProviderProfileService } from '../services/provider-profile.service';
import { VerificationDocumentsService } from '../services/verification-documents.service';
import { UsersService } from '../services/users.service';
import { SetUserStatusDto } from '../dto/set-user-status.dto';
import { AuthenticatedUser } from '../strategies/jwt.strategy';

class QueryAdminProvidersDto extends CursorPaginationDto {
  @ApiPropertyOptional({ description: 'Partial match against business name, owner name, or email' })
  @IsOptional()
  @IsString()
  search?: string;
}

class RejectVerificationDto {
  @IsString()
  @MinLength(5)
  reason: string;
}

class ApproveVerificationDocumentDto {
  @IsOptional()
  @IsString()
  note?: string;
}

class RejectVerificationDocumentDto {
  @IsString()
  @MinLength(5)
  reason: string;
}

/**
 * Every route here requires the ADMIN or SUPER_ADMIN role — enforced by
 * RolesGuard reading the class-level @Roles() decorator, not by an
 * `if (user.role !== 'admin')` check duplicated in every method. PRD §8
 * grants Admin "approve/verify providers"; this controller is that
 * capability's HTTP surface. Business logic still lives in
 * ProviderProfileService — this stays a thin routing layer.
 */
@ApiTags('admin')
@ApiBearerAuth()
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Controller('admin/providers')
export class AdminProvidersController {
  constructor(
    private readonly providerService: ProviderProfileService,
    private readonly verificationDocumentsService: VerificationDocumentsService,
    private readonly usersService: UsersService,
  ) {}

  @Get('verification-queue')
  async verificationQueue() {
    return this.providerService.getVerificationQueue();
  }

  /** [Admin] Providers view — every provider, any verification status, unlike the verification-queue above. Registered before :id so "verification-queue" itself never gets swallowed by :id (it's a separate literal segment, but kept adjacent for clarity). */
  @Get()
  async search(@Query() query: QueryAdminProvidersDto) {
    return this.providerService.searchForAdmin(query.search, query.cursor, query.limit);
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.providerService.getDetailForAdmin(id);
  }

  /** Suspending/reinstating a provider acts on their underlying user account — the same status flag that already gates login — not a separate field on ProviderProfile. */
  @Post(':id/status')
  async setStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetUserStatusDto,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    const profile = await this.providerService.getById(id);
    return this.usersService.setStatus(profile.userId, dto.status, admin.id, dto.reason);
  }

  @Post(':id/verify')
  async verify(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() admin: AuthenticatedUser) {
    return this.providerService.approveVerification(id, admin.id);
  }

  @Post(':id/reject')
  async reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectVerificationDto,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    return this.providerService.rejectVerification(id, admin.id, dto.reason);
  }

  @Get(':id/verification-documents')
  async listVerificationDocuments(@Param('id', ParseUUIDPipe) id: string) {
    return this.verificationDocumentsService.listForProvider(id);
  }

  @Post('verification-documents/:documentId/approve')
  async approveVerificationDocument(
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Body() dto: ApproveVerificationDocumentDto,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    return this.verificationDocumentsService.approve(documentId, admin.id, dto.note);
  }

  @Post('verification-documents/:documentId/reject')
  async rejectVerificationDocument(
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Body() dto: RejectVerificationDocumentDto,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    return this.verificationDocumentsService.reject(documentId, admin.id, dto.reason);
  }
}
