import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from '@common/base/base.repository';
import { PasswordResetToken } from '../entities/password-reset-token.entity';

@Injectable()
export class PasswordResetTokenRepository extends BaseRepository<PasswordResetToken> {
  constructor(@InjectRepository(PasswordResetToken) repository: Repository<PasswordResetToken>) {
    super(repository);
  }

  async findByTokenHash(tokenHash: string): Promise<PasswordResetToken | null> {
    return this.repository.findOne({ where: { tokenHash } });
  }
}
