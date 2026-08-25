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
      throw DomainException.notFound(
        ErrorCode.RESOURCE_NOT_FOUND,
        'No provider profile exists for this user.',
      );
    }
    return profile;
  }

  /**
   * Public profile surface — listing cards/detail pages show this for
   * "who's renting this out." Individual providers (no businessName) fall
   * back to the linked user's full name; never exposes anything else about
   * the user (passwordHash is @Exclude()d on the entity regardless, but this
   * also never returns the user object itself, just the derived name).
   */
  async getPublicProfile(id: string): Promise<{
    id: string;
    name: string;
    avgRating: number;
    avgResponseTimeMinutes: number;
    totalCompletedBookings: number;
    verificationStatus: ProviderVerificationStatus;
  }> {
    const profile = await this.providerRepository.findByIdWithUser(id);
    if (!profile) {
      throw DomainException.notFound(ErrorCode.RESOURCE_NOT_FOUND, 'Provider was not found.');
    }
    return {
      id: profile.id,
      name: profile.businessName ?? profile.user.fullName,
      avgRating: profile.avgRating,
      avgResponseTimeMinutes: profile.avgResponseTimeMinutes,
      totalCompletedBookings: profile.totalCompletedBookings,
      verificationStatus: profile.verificationStatus,
    };
  }

  async getVerificationQueue(): Promise<ProviderProfile[]> {
    return this.providerRepository.findPendingVerification();
  }

  async getById(id: string): Promise<ProviderProfile> {
    return this.providerRepository.findByIdOrFail(id, 'Provider profile');
  }

  /** [Trust] Recomputes the denormalized avgRating from a fresh aggregate over Review rows — never written directly by review submission itself. */
  async recomputeRatingAggregate(profileId: string, avgRating: number): Promise<ProviderProfile> {
    const profile = await this.providerRepository.findByIdOrFail(profileId, 'Provider profile');
    profile.avgRating = avgRating;
    return this.providerRepository.save(profile);
  }

  /** [Booking] Called once per booking that reaches COMPLETED, independent of whether it's ever reviewed. */
  async incrementCompletedBookings(profileId: string): Promise<void> {
    await this.providerRepository.incrementCompletedBookings(profileId);
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

  async rejectVerification(
    providerId: string,
    _adminId: string,
    reason: string,
  ): Promise<ProviderProfile> {
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
