import { Column, Entity } from 'typeorm';
import { BaseEntity } from '@common/base/base.entity';
import { CampaignTrafficEventType } from '../enums/campaign-traffic-event-type.enum';

/**
 * Landing-page funnel tracking (brief §14) — mirrors SwapConnect's own
 * campaign_events privacy design exactly: no user id, no IP, referrer host
 * only (never the full referrer URL), deduped client-side via a per-tab
 * sessionStorage key so a reload never double-counts. `sessionKey` is that
 * opaque per-tab id, stored so a future dedupe window could be enforced
 * server-side too, but nothing here can be traced back to a person.
 */
@Entity('campaign_traffic_events')
export class CampaignTrafficEvent extends BaseEntity {
  @Column({ type: 'enum', enum: CampaignTrafficEventType })
  type: CampaignTrafficEventType;

  @Column({ type: 'text' })
  path: string;

  @Column({ name: 'referral_code', type: 'text', nullable: true })
  referralCode?: string | null;

  @Column({ name: 'utm_source', type: 'text', nullable: true })
  utmSource?: string | null;

  @Column({ name: 'utm_medium', type: 'text', nullable: true })
  utmMedium?: string | null;

  @Column({ name: 'utm_campaign', type: 'text', nullable: true })
  utmCampaign?: string | null;

  @Column({ name: 'referrer_host', type: 'text', nullable: true })
  referrerHost?: string | null;

  @Column({ name: 'session_key', type: 'text' })
  sessionKey: string;
}
