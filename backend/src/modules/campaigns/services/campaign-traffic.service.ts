import { Injectable } from '@nestjs/common';
import { CampaignTrafficEventRepository } from '../repositories/campaign-traffic-event.repository';
import { ReferralAttributionRepository } from '../repositories/referral-attribution.repository';
import { RecordTrafficEventDto } from '../dto/record-traffic-event.dto';
import { ReferralStatus } from '../enums/referral-status.enum';
import { CampaignTrafficEventType } from '../enums/campaign-traffic-event-type.enum';

export interface CampaignFunnel {
  sinceDays: number;
  pageViews: number;
  ctaClicks: number;
  referredSignups: number;
  qualifiedReferrals: number;
  daily: Array<{ day: string; pageViews: number; ctaClicks: number }>;
}

/** Phase 7 — the funnel reuses existing referral data rather than tracking signups twice: every ReferralAttribution row already IS a referred signup. */
@Injectable()
export class CampaignTrafficService {
  constructor(
    private readonly trafficEventRepository: CampaignTrafficEventRepository,
    private readonly attributionRepository: ReferralAttributionRepository,
  ) {}

  async recordEvent(dto: RecordTrafficEventDto): Promise<void> {
    const row = this.trafficEventRepository.create({
      type: dto.type,
      path: dto.path,
      sessionKey: dto.sessionKey,
      referralCode: dto.referralCode ?? null,
      utmSource: dto.utmSource ?? null,
      utmMedium: dto.utmMedium ?? null,
      utmCampaign: dto.utmCampaign ?? null,
      referrerHost: dto.referrerHost ?? null,
    });
    await this.trafficEventRepository.save(row);
  }

  async getFunnel(days = 30): Promise<CampaignFunnel> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const [trafficCounts, referralCounts, dailyRows] = await Promise.all([
      this.trafficEventRepository.countsSince(since),
      this.attributionRepository.countsSince(since),
      this.trafficEventRepository.dailySeriesSince(since),
    ]);

    const byDay = new Map<string, { pageViews: number; ctaClicks: number }>();
    for (const row of dailyRows) {
      const entry = byDay.get(row.day) ?? { pageViews: 0, ctaClicks: 0 };
      if (row.type === CampaignTrafficEventType.PAGE_VIEW) entry.pageViews = row.count;
      if (row.type === CampaignTrafficEventType.CTA_CLICK) entry.ctaClicks = row.count;
      byDay.set(row.day, entry);
    }

    return {
      sinceDays: days,
      pageViews: trafficCounts[CampaignTrafficEventType.PAGE_VIEW] ?? 0,
      ctaClicks: trafficCounts[CampaignTrafficEventType.CTA_CLICK] ?? 0,
      referredSignups: Object.values(referralCounts).reduce((sum, n) => sum + n, 0),
      qualifiedReferrals: referralCounts[ReferralStatus.QUALIFIED] ?? 0,
      daily: [...byDay.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([day, counts]) => ({ day, ...counts })),
    };
  }
}
