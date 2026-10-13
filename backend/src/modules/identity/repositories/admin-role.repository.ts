import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from '@common/base/base.repository';
import { AdminRole } from '../entities/admin-role.entity';

@Injectable()
export class AdminRoleRepository extends BaseRepository<AdminRole> {
  constructor(@InjectRepository(AdminRole) repository: Repository<AdminRole>) {
    super(repository);
  }

  async findAll(): Promise<AdminRole[]> {
    return this.repository.find({ order: { name: 'ASC' } });
  }
}
