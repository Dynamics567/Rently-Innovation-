import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from '@common/base/base.repository';
import { CursorPage } from '@common/dto/cursor-pagination.dto';
import { Notification } from '../entities/notification.entity';

interface Cursor {
  createdAt: string;
  id: string;
}

function encodeCursor(row: Notification): string {
  return Buffer.from(JSON.stringify({ createdAt: row.createdAt.toISOString(), id: row.id })).toString(
    'base64',
  );
}

function decodeCursor(cursor: string): Cursor {
  return JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'));
}

@Injectable()
export class NotificationRepository extends BaseRepository<Notification> {
  constructor(@InjectRepository(Notification) repository: Repository<Notification>) {
    super(repository);
  }

  async listForRecipient(
    recipientId: string,
    filter: { unreadOnly?: boolean; cursor?: string; limit?: number },
  ): Promise<CursorPage<Notification>> {
    const qb = this.repository
      .createQueryBuilder('n')
      .where('n.recipientId = :recipientId', { recipientId });

    if (filter.unreadOnly) {
      qb.andWhere('n.readAt IS NULL');
    }

    qb.orderBy('n.createdAt', 'DESC').addOrderBy('n.id', 'DESC');

    if (filter.cursor) {
      const { createdAt, id } = decodeCursor(filter.cursor);
      qb.andWhere('(n.createdAt, n.id) < (:cAt, :cId)', { cAt: createdAt, cId: id });
    }

    const limit = filter.limit ?? 20;
    const rows = await qb.take(limit + 1).getMany();
    const hasMore = rows.length > limit;
    const data = hasMore ? rows.slice(0, limit) : rows;

    return {
      data,
      meta: { hasMore, nextCursor: hasMore ? encodeCursor(data[data.length - 1]) : null },
    };
  }

  async markAllRead(recipientId: string): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .update(Notification)
      .set({ readAt: new Date() })
      .where('recipient_id = :recipientId', { recipientId })
      .andWhere('read_at IS NULL')
      .execute();
  }
}
