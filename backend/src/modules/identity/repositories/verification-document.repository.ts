import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from '@common/base/base.repository';
import { VerificationDocument } from '../entities/verification-document.entity';

@Injectable()
export class VerificationDocumentRepository extends BaseRepository<VerificationDocument> {
  constructor(
    @InjectRepository(VerificationDocument) repository: Repository<VerificationDocument>,
  ) {
    super(repository);
  }

  async findByProvider(providerId: string): Promise<VerificationDocument[]> {
    return this.repository.find({
      where: { providerId },
      order: { createdAt: 'DESC' },
    });
  }
}
