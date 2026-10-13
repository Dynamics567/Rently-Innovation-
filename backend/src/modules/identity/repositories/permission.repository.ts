import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from '@common/base/base.repository';
import { Permission } from '../entities/permission.entity';

@Injectable()
export class PermissionRepository extends BaseRepository<Permission> {
  constructor(@InjectRepository(Permission) repository: Repository<Permission>) {
    super(repository);
  }

  async findAll(): Promise<Permission[]> {
    return this.repository.find({ order: { module: 'ASC', label: 'ASC' } });
  }

  async findByKey(key: string): Promise<Permission | null> {
    return this.repository.findOne({ where: { key } });
  }
}
