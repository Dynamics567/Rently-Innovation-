import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from '@common/base/base.repository';
import { Dispute } from '../entities/dispute.entity';
import { DisputeStatus } from '../enums/dispute-status.enum';

@Injectable()
export class DisputeRepository extends BaseRepository<Dispute> {
  constructor(@InjectRepository(Dispute) repository: Repository<Dispute>) {
    super(repository);
  }

  async findByBooking(bookingId: string): Promise<Dispute | null> {
    return this.repository.findOne({ where: { bookingId } });
  }

  async findAll(status?: DisputeStatus): Promise<Dispute[]> {
    return this.repository.find({
      where: status ? { status } : {},
      order: { createdAt: 'DESC' },
    });
  }
}
