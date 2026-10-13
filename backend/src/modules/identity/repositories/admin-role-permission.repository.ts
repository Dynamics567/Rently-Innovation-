import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { BaseRepository } from '@common/base/base.repository';
import { AdminRolePermission } from '../entities/admin-role-permission.entity';

@Injectable()
export class AdminRolePermissionRepository extends BaseRepository<AdminRolePermission> {
  constructor(@InjectRepository(AdminRolePermission) repository: Repository<AdminRolePermission>) {
    super(repository);
  }

  /** Every grant for a set of roles — used to check "does any of this user's roles grant X." */
  async findByRoleIds(adminRoleIds: string[]): Promise<AdminRolePermission[]> {
    if (!adminRoleIds.length) return [];
    return this.repository.find({ where: { adminRoleId: In(adminRoleIds) } });
  }

  /** Every grant across every role — one query to build the full permissions matrix, not one per role. */
  async findAll(): Promise<AdminRolePermission[]> {
    return this.repository.find();
  }
}
