import { Injectable } from '@nestjs/common';
import { DomainException } from '@common/errors/domain.exception';
import { ErrorCode } from '@common/errors/error-codes.enum';
import { ProviderProfileRepository } from '../repositories/provider-profile.repository';
import { UserRepository } from '../repositories/user.repository';
import { CreateProviderProfileDto } from '../dto/create-provider-profile.dto';
import { ProviderProfile } from '../entities/provider-profile.entity';
import { ProviderVerificationStatus } from '../enums/verification-status.enum';
import { UserRole } from '../enums/user-role.enum';

@Injectable()
export class ProviderProfileService {
  constructor(
    private readonly providerRepository: ProviderProfileRepository,
    private readonly userRepository: UserRepository,
  ) {}

  /** PRD FR1.1/§11.2 step 1 — a user "upgrades" to Provider without losing their Renter identity. */
  async createProfile(userId: string, dto: CreateProviderProfileDto): Promise<ProviderProfile> {
    const existing = await this.providerRepository.findByUserId(userId);
    if (existing) {
      return existing;
    }

    const user = await this.userRepository.findByIdOrFail(userId, 'User');
    if (!user.hasRole(UserRole.PROVIDER)) {
      user.roles = [...user.roles, UserRole.PROVIDER];
      await this.userRepository.save(user);
    }

    const profile = this.providerRepository.create({
      userId,
      businessName: dto.businessName,
      businessRegistrationNo: dto.businessRegistrationNo,
      verificationStatus: ProviderVerificationStatus.PENDING,
    });
    return this.providerRepository.save(profile);
  }

  async getByUserId(userId: string): Promise<ProviderProfile> {
    const profile = await this.providerRepository.findByUserId(userId);
    if (!profile) {
      throw DomainException.notFound(ErrorCode.RESOURCE_NOT_FOUND, 'No provider profile exists for this user.');
    }
    return profile;
  }

  async getVerificationQueue(): Promise<ProviderProfile[]> {
    return this.providerRepository.findPendingVerification();
  }

  /**
   * Admin action — PRD FR9.1. `_adminId` isn't stored on the entity itself;
   * it's captured by the Postgres audit-log trigger (docs/DATABASE_SCHEMA.md
   * `audit_log`) alongside before/after state, which is the actual system of
   * record for "who approved this" — not an application-level field that a
   * bug could skip writing.
   */
  async approveVerification(providerId: string, _adminId: string): Promise<ProviderProfile> {
    const profile = await this.providerRepository.findByIdOrFail(providerId, 'Provider profile');
    profile.verificationStatus = ProviderVerificationStatus.VERIFIED;
    profile.verificationNotes = null;
    return this.providerRepository.save(profile);
  }

  async rejectVerification(providerId: string, _adminId: string, reason: string): Promise<ProviderProfile> {
    const profile = await this.providerRepository.findByIdOrFail(providerId, 'Provider profile');
    profile.verificationStatus = ProviderVerificationStatus.REJECTED;
    profile.verificationNotes = reason;
    return this.providerRepository.save(profile);
  }

  assertVerified(profile: ProviderProfile): void {
    if (!profile.isVerified()) {
      throw DomainException.forbidden(
        ErrorCode.PROVIDER_NOT_VERIFIED,
        'Your provider account must be verified before you can do this.',
      );
    }
  }
}
