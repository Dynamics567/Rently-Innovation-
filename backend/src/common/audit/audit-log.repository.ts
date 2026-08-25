import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from '@common/base/base.repository';
import { CursorPage } from '@common/dto/cursor-pagination.dto';
import { AuditLog } from './audit-log.entity';

interface Cursor {
  createdAt: string;
  id: string;
}

function encodeCursor(row: AuditLog): string {
  return Buffer.from(JSON.stringify({ createdAt: row.createdAt.toISOString(), id: row.id })).toString(
    'base64',
  );
}

function decodeCursor(cursor: string): Cursor {
  return JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'));
}

@Injectable()
export class AuditLogRepository extends BaseRepository<AuditLog> {
  constructor(@InjectRepository(AuditLog) repository: Repository<AuditLog>) {
    super(repository);
  }

  async findForEntity(entityType: string, entityId: string): Promise<AuditLog[]> {
    return this.repository.find({
      where: { entityType, entityId },
      order: { createdAt: 'DESC' },
    });
  }

  async search(filter: {
    entityType?: string;
    entityId?: string;
    actorId?: string;
    cursor?: string;
    limit?: number;
  }): Promise<CursorPage<AuditLog>> {
    const qb = this.repository.createQueryBuilder('log');
    if (filter.entityType) qb.andWhere('log.entityType = :entityType', { entityType: filter.entityType });
    if (filter.entityId) qb.andWhere('log.entityId = :entityId', { entityId: filter.entityId });
    if (filter.actorId) qb.andWhere('log.actorId = :actorId', { actorId: filter.actorId });

    qb.orderBy('log.createdAt', 'DESC').addOrderBy('log.id', 'DESC');

    if (filter.cursor) {
      const { createdAt, id } = decodeCursor(filter.cursor);
      qb.andWhere('(log.createdAt, log.id) < (:cAt, :cId)', { cAt: createdAt, cId: id });
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
}
