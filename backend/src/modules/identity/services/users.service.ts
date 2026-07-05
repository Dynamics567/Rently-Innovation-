import { Injectable } from '@nestjs/common';
import { UserRepository } from '../repositories/user.repository';
import { User } from '../entities/user.entity';

@Injectable()
export class UsersService {
  constructor(private readonly userRepository: UserRepository) {}

  async getById(id: string): Promise<User> {
    return this.userRepository.findByIdOrFail(id, 'User');
  }

  async updateProfile(id: string, patch: Partial<Pick<User, 'fullName'>>): Promise<User> {
    const user = await this.userRepository.findByIdOrFail(id, 'User');
    Object.assign(user, patch);
    return this.userRepository.save(user);
  }
}
