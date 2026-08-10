import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from '@common/base/base.repository';
import { ListingPhoto } from '../entities/listing-photo.entity';

@Injectable()
export class ListingPhotoRepository extends BaseRepository<ListingPhoto> {
  constructor(@InjectRepository(ListingPhoto) repository: Repository<ListingPhoto>) {
    super(repository);
  }

  async findByListing(listingId: string): Promise<ListingPhoto[]> {
    return this.repository.find({ where: { listingId }, order: { position: 'ASC' } });
  }

  async countByListing(listingId: string): Promise<number> {
    return this.repository.count({ where: { listingId } });
  }
}
