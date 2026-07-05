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

  /** Backs GET /admin/providers/verification-queue (PRD FR9.1). */
  async findPendingVerification(): Promise<ProviderProfile[]> {
    return this.repository.find({
      where: { verificationStatus: ProviderVerificationStatus.PENDING },
      relations: ['verificationDocuments', 'user'],
      order: { createdAt: 'ASC' },
    });
  }
}
