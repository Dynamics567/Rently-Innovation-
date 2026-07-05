import { FindOptionsWhere, Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { BaseEntity } from './base.entity';

/**
 * The Repository layer exists so Services never import TypeORM directly.
 * A Service asks "give me the active provider with this id" in domain
 * language; it does not know or care that this is a Postgres query with a
 * soft-delete filter. That indirection is what lets us swap persistence
 * details (add a read replica, change an index, even change ORMs) without
 * touching business logic.
 */
export abstract class BaseRepository<T extends BaseEntity> {
  protected constructor(protected readonly repository: Repository<T>) {}

  async findById(id: string): Promise<T | null> {
    return this.repository.findOne({ where: { id } as FindOptionsWhere<T> });
  }

  async findByIdOrFail(id: string, entityName = 'Resource'): Promise<T> {
    const entity = await this.findById(id);
    if (!entity) {
      throw new NotFoundException(`${entityName} with id "${id}" was not found`);
    }
    return entity;
  }

  async save(entity: T): Promise<T> {
    return this.repository.save(entity);
  }

  async softDelete(id: string): Promise<void> {
    await this.repository.softDelete(id);
  }

  create(partial: Partial<T>): T {
    return this.repository.create(partial as T);
  }
}
