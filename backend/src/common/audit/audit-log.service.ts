import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { CursorPage } from '@common/dto/cursor-pagination.dto';
import { AuditLog } from './audit-log.entity';
import { AuditLogRepository } from './audit-log.repository';
import { AuditActorType } from './audit-actor-type.enum';

export interface AuditLogEntry {
  actorId: string | null;
  actorType: AuditActorType;
  action: string;
  entityType: string;
  entityId: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
}

@Injectable()
export class AuditLogService {
  constructor(private readonly repository: AuditLogRepository) {}

  /**
   * `manager` is optional — most call sites are a single-row save with no
   * surrounding transaction, so they just await this right after saving.
   * The one call site with money-adjacent state inside a real transaction
   * (dispute resolution) passes its own manager through for true atomicity.
   */
  async record(entry: AuditLogEntry, manager?: EntityManager): Promise<AuditLog> {
    const repo = manager ? manager.getRepository(AuditLog) : undefined;
    const row = this.repository.create({
      actorId: entry.actorId,
      actorType: entry.actorType,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      before: entry.before ?? null,
      after: entry.after ?? null,
    });
    return repo ? repo.save(row) : this.repository.save(row);
  }

  async listForEntity(entityType: string, entityId: string): Promise<AuditLog[]> {
    return this.repository.findForEntity(entityType, entityId);
  }

  async search(filter: {
    entityType?: string;
    entityId?: string;
    actorId?: string;
    cursor?: string;
    limit?: number;
  }): Promise<CursorPage<AuditLog>> {
    return this.repository.search(filter);
  }
}
