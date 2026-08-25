import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from '@common/base/base.repository';
import { BookingExtensionRequest } from '../entities/booking-extension-request.entity';
import { ExtensionRequestStatus } from '../enums/extension-request-status.enum';

@Injectable()
export class BookingExtensionRequestRepository extends BaseRepository<BookingExtensionRequest> {
  constructor(@InjectRepository(BookingExtensionRequest) repository: Repository<BookingExtensionRequest>) {
    super(repository);
  }

  async findByBooking(bookingId: string): Promise<BookingExtensionRequest[]> {
    return this.repository.find({ where: { bookingId }, order: { createdAt: 'DESC' } });
  }

  async findPendingForBooking(bookingId: string): Promise<BookingExtensionRequest | null> {
    return this.repository.findOne({
      where: { bookingId, status: ExtensionRequestStatus.PENDING },
    });
  }
}
