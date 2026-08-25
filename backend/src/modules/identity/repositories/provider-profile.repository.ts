import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from '@common/base/base.repository';
import { ProviderProfile } from '../entities/provider-profile.entity';
import { ProviderVerificationStatus } from '../enums/verification-status.enum';

@Injectable()
export class ProviderProfileRepository extends BaseRepository<ProviderProfile> {
  constructor(@InjectRepository(ProviderProfile) repository: Repository<ProviderProfile>) {
    super(repository);
  }

  async findByUserId(userId: string): Promise<ProviderProfile | null> {
    return this.repository.findOne({ where: { userId } });
  }

  /** Backs the public GET /providers/:id profile — needs the linked User for the individual-provider display-name fallback. */
  async findByIdWithUser(id: string): Promise<ProviderProfile | null> {
    return this.repository.findOne({ where: { id }, relations: ['user'] });
  }

  /** Backs GET /admin/providers/verification-queue (PRD FR9.1). */
  async findPendingVerification(): Promise<ProviderProfile[]> {
    return this.repository.find({
      where: { verificationStatus: ProviderVerificationStatus.PENDING },
      relations: ['verificationDocuments', 'user'],
      order: { createdAt: 'ASC' },
    });
  }

  /** Atomic increment — avoids a read-modify-write race between two bookings completing for the same provider at once. */
  async incrementCompletedBookings(id: string): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .update(ProviderProfile)
      .set({ totalCompletedBookings: () => '"total_completed_bookings" + 1' })
      .where('id = :id', { id })
      .execute();
  }
}
