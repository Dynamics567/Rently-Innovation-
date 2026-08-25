import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from '@common/base/base.repository';
import { Asset } from '../entities/asset.entity';
import { AssetProviderStatus } from '../enums/listing.enums';

@Injectable()
export class AssetRepository extends BaseRepository<Asset> {
  constructor(@InjectRepository(Asset) repository: Repository<Asset>) {
    super(repository);
  }

  async findByListing(listingId: string): Promise<Asset[]> {
    return this.repository.find({ where: { listingId }, order: { createdAt: 'ASC' } });
  }

  async findActiveByListing(listingId: string): Promise<Asset[]> {
    return this.repository.find({
      where: { listingId, providerStatus: AssetProviderStatus.ACTIVE },
      order: { createdAt: 'ASC' },
    });
  }

  async countByListing(listingId: string): Promise<number> {
    return this.repository.count({ where: { listingId } });
  }

  async countActiveByListing(listingId: string): Promise<number> {
    return this.repository.count({ where: { listingId, providerStatus: AssetProviderStatus.ACTIVE } });
  }
}
