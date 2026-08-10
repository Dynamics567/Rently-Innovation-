import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from '@common/base/base.repository';
import { AvailabilityBlock } from '../entities/availability-block.entity';

@Injectable()
export class AvailabilityBlockRepository extends BaseRepository<AvailabilityBlock> {
  constructor(@InjectRepository(AvailabilityBlock) repository: Repository<AvailabilityBlock>) {
    super(repository);
  }

  async findByListingInRange(
    listingId: string,
    from: Date,
    to: Date,
  ): Promise<AvailabilityBlock[]> {
    return this.repository
      .createQueryBuilder('block')
      .where('block.listingId = :listingId', { listingId })
      .andWhere('block.during && tstzrange(:from, :to)', {
        from: from.toISOString(),
        to: to.toISOString(),
      })
      .getMany();
  }

  /** Does any manual block overlap this exact interval? Used by BookingModule's availability check via CatalogService. */
  async hasOverlap(listingId: string, from: Date, to: Date): Promise<boolean> {
    const count = await this.repository
      .createQueryBuilder('block')
      .where('block.listingId = :listingId', { listingId })
      .andWhere('block.during && tstzrange(:from, :to)', {
        from: from.toISOString(),
        to: to.toISOString(),
      })
      .getCount();
    return count > 0;
  }
}
