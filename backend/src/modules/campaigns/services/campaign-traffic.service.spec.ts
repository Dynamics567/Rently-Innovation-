import { CampaignTrafficService } from './campaign-traffic.service';
import { CampaignTrafficEventRepository } from '../repositories/campaign-traffic-event.repository';
import { ReferralAttributionRepository } from '../repositories/referral-attribution.repository';
import { CampaignTrafficEventType } from '../enums/campaign-traffic-event-type.enum';
import { ReferralStatus } from '../enums/referral-status.enum';

describe('CampaignTrafficService', () => {
  let trafficEventRepository: Record<
    'create' | 'save' | 'countsSince' | 'dailySeriesSince',
    jest.Mock
  >;
  let attributionRepository: Record<'countsSince', jest.Mock>;
  let service: CampaignTrafficService;

  beforeEach(() => {
    trafficEventRepository = {
      create: jest.fn((partial) => partial),
      save: jest.fn(async (entity) => entity),
      countsSince: jest.fn(async () => ({
        [CampaignTrafficEventType.PAGE_VIEW]: 100,
        [CampaignTrafficEventType.CTA_CLICK]: 40,
      })),
      dailySeriesSince: jest.fn(async () => [
        { day: '2026-11-01', type: CampaignTrafficEventType.PAGE_VIEW, count: 50 },
        { day: '2026-11-01', type: CampaignTrafficEventType.CTA_CLICK, count: 20 },
      ]),
    };
    attributionRepository = {
      countsSince: jest.fn(async () => ({
        [ReferralStatus.PENDING]: 5,
        [ReferralStatus.QUALIFIED]: 3,
      })),
    };
    service = new CampaignTrafficService(
      trafficEventRepository as unknown as CampaignTrafficEventRepository,
      attributionRepository as unknown as ReferralAttributionRepository,
    );
  });

  describe('recordEvent', () => {
    it('saves a new traffic event', async () => {
      await service.recordEvent({
        type: CampaignTrafficEventType.PAGE_VIEW,
        path: '/campaign-refer-win',
        sessionKey: 'sess-1',
      });
      expect(trafficEventRepository.save).toHaveBeenCalled();
    });
  });

  describe('getFunnel', () => {
    it('combines traffic and referral counts into one funnel, with a daily series merged by day', async () => {
      const funnel = await service.getFunnel(30);

      expect(funnel.pageViews).toBe(100);
      expect(funnel.ctaClicks).toBe(40);
      expect(funnel.referredSignups).toBe(8);
      expect(funnel.qualifiedReferrals).toBe(3);
      expect(funnel.daily).toEqual([{ day: '2026-11-01', pageViews: 50, ctaClicks: 20 }]);
    });
  });
});
