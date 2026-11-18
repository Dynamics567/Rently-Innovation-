import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from '@common/base/base.repository';
import { CampaignTrafficEvent } from '../entities/campaign-traffic-event.entity';

@Injectable()
export class CampaignTrafficEventRepository extends BaseRepository<CampaignTrafficEvent> {
  constructor(
    @InjectRepository(CampaignTrafficEvent) repository: Repository<CampaignTrafficEvent>,
  ) {
    super(repository);
  }

  /** Total page views / CTA clicks since a given date — the top of the funnel. */
  async countsSince(since: Date): Promise<Record<string, number>> {
    const rows = await this.repository
      .createQueryBuilder('event')
      .select('event.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('event.createdAt >= :since', { since })
      .groupBy('event.type')
      .getRawMany();
    return Object.fromEntries(rows.map((r) => [r.type, Number(r.count)]));
  }

  /** One row per (day, type) for the funnel's daily chart — Africa/Lagos has no DST, so a plain date_trunc is exact. */
  async dailySeriesSince(
    since: Date,
  ): Promise<Array<{ day: string; type: string; count: number }>> {
    const rows = await this.repository
      .createQueryBuilder('event')
      .select("to_char(event.createdAt, 'YYYY-MM-DD')", 'day')
      .addSelect('event.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('event.createdAt >= :since', { since })
      .groupBy('day')
      .addGroupBy('event.type')
      .orderBy('day', 'ASC')
      .getRawMany();
    return rows.map((r) => ({ day: r.day, type: r.type, count: Number(r.count) }));
  }
}
