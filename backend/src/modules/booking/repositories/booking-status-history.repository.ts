import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from '@common/base/base.repository';
import { BookingStatusHistory } from '../entities/booking-status-history.entity';

@Injectable()
export class BookingStatusHistoryRepository extends BaseRepository<BookingStatusHistory> {
  constructor(
    @InjectRepository(BookingStatusHistory) repository: Repository<BookingStatusHistory>,
  ) {
    super(repository);
  }

  async findByBooking(bookingId: string): Promise<BookingStatusHistory[]> {
    return this.repository.find({ where: { bookingId }, order: { createdAt: 'ASC' } });
  }
}
