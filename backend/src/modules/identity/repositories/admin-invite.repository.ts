import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from '@common/base/base.repository';
import { AdminInvite } from '../entities/admin-invite.entity';

@Injectable()
export class AdminInviteRepository extends BaseRepository<AdminInvite> {
  constructor(@InjectRepository(AdminInvite) repository: Repository<AdminInvite>) {
    super(repository);
  }

  async findByTokenHash(tokenHash: string): Promise<AdminInvite | null> {
    return this.repository.findOne({ where: { tokenHash } });
  }

  /** The invite an email would actually redeem at signup — most recent first, since a re-invite after revoking an older one should win. */
  async findActiveByEmail(email: string): Promise<AdminInvite | null> {
    return this.repository.findOne({ where: { email }, order: { createdAt: 'DESC' } });
  }

  /** [Admin Team view] Every invite not yet accepted or revoked, regardless of expiry — an expired-but-visible row is what tells a super admin "this one needs re-sending," not silence. */
  async findPending(): Promise<AdminInvite[]> {
    return this.repository
      .createQueryBuilder('invite')
      .where('invite.acceptedAt IS NULL')
      .andWhere('invite.revokedAt IS NULL')
      .orderBy('invite.createdAt', 'DESC')
      .getMany();
  }
}
