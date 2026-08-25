import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from '@common/base/base.repository';
import { Message } from '../entities/message.entity';

@Injectable()
export class MessageRepository extends BaseRepository<Message> {
  constructor(@InjectRepository(Message) repository: Repository<Message>) {
    super(repository);
  }

  /** A booking's thread is inherently bounded (unlike a general inbox), so this is a plain ordered list — no cursor pagination. */
  async listForConversation(conversationId: string): Promise<Message[]> {
    return this.repository.find({
      where: { conversationId },
      order: { createdAt: 'ASC' },
    });
  }

  async markReadForRecipient(conversationId: string, recipientId: string): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .update(Message)
      .set({ readAt: new Date() })
      .where('conversation_id = :conversationId', { conversationId })
      .andWhere('sender_id != :recipientId', { recipientId })
      .andWhere('read_at IS NULL')
      .execute();
  }
}
