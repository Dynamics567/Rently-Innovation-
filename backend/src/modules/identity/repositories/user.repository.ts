import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from '@common/base/base.repository';
import { User } from '../entities/user.entity';

@Injectable()
export class UserRepository extends BaseRepository<User> {
  constructor(@InjectRepository(User) repository: Repository<User>) {
    super(repository);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.repository.findOne({ where: { email } });
  }

  async findByPhone(phone: string): Promise<User | null> {
    return this.repository.findOne({ where: { phone } });
  }

  async findByEmailOrPhone(identifier: { email?: string; phone?: string }): Promise<User | null> {
    if (identifier.email) return this.findByEmail(identifier.email);
    if (identifier.phone) return this.findByPhone(identifier.phone);
    return null;
  }

  async findWithProviderProfile(id: string): Promise<User | null> {
    return this.repository.findOne({ where: { id }, relations: ['providerProfile'] });
  }
}
