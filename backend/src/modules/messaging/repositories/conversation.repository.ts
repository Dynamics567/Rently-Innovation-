import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from '@common/base/base.repository';
import { Conversation } from '../entities/conversation.entity';

@Injectable()
export class ConversationRepository extends BaseRepository<Conversation> {
  constructor(@InjectRepository(Conversation) repository: Repository<Conversation>) {
    super(repository);
  }

  async findByBooking(bookingId: string): Promise<Conversation | null> {
    return this.repository.findOne({ where: { bookingId } });
  }
}
