import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from '@common/base/base.repository';
import { ReferralMilestone } from '../entities/referral-milestone.entity';
import { ReferralMilestoneType } from '../enums/referral-milestone-type.enum';

const POSTGRES_UNIQUE_VIOLATION = '23505';

@Injectable()
export class ReferralMilestoneRepository extends BaseRepository<ReferralMilestone> {
  constructor(@InjectRepository(ReferralMilestone) repository: Repository<ReferralMilestone>) {
    super(repository);
  }

  async findByAttributionId(referralAttributionId: string): Promise<ReferralMilestone[]> {
    return this.repository.find({ where: { referralAttributionId }, order: { achievedAt: 'ASC' } });
  }

  /**
   * Relies on the unique index on (referralAttributionId, milestoneType) —
   * brief §7: "a milestone must only be awarded once per referral." Returns
   * null on a duplicate instead of throwing, since every call site here is
   * an event listener reacting to something that may legitimately fire
   * more than once (e.g. a provider could in theory get re-verified).
   */
  async recordIfNew(referralAttributionId: string, milestoneType: ReferralMilestoneType): Promise<ReferralMilestone | null> {
    try {
      const row = this.create({ referralAttributionId, milestoneType, achievedAt: new Date() });
      return await this.save(row);
    } catch (err) {
      if ((err as { code?: string }).code === POSTGRES_UNIQUE_VIOLATION) return null;
      throw err;
    }
  }
}
