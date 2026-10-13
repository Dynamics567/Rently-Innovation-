import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from '@common/base/base.repository';
import { UserAdminRole } from '../entities/user-admin-role.entity';

@Injectable()
export class UserAdminRoleRepository extends BaseRepository<UserAdminRole> {
  constructor(@InjectRepository(UserAdminRole) repository: Repository<UserAdminRole>) {
    super(repository);
  }

  async findByUser(userId: string): Promise<UserAdminRole[]> {
    return this.repository.find({ where: { userId } });
  }

  async findOneForUserAndRole(userId: string, adminRoleId: string): Promise<UserAdminRole | null> {
    return this.repository.findOne({ where: { userId, adminRoleId } });
  }
}
