import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from '@common/base/base.repository';
import { CampaignPrizeSnapshot } from '../entities/campaign-prize-snapshot.entity';

@Injectable()
export class CampaignPrizeSnapshotRepository extends BaseRepository<CampaignPrizeSnapshot> {
  constructor(
    @InjectRepository(CampaignPrizeSnapshot) repository: Repository<CampaignPrizeSnapshot>,
  ) {
    super(repository);
  }

  async getLatest(): Promise<CampaignPrizeSnapshot | null> {
    return this.repository.findOne({ where: {}, order: { syncedAt: 'DESC' }, withDeleted: false });
  }
}
