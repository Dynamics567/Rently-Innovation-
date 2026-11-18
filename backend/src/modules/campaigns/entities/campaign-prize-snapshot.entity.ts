import { Column, Entity } from 'typeorm';
import { BaseEntity } from '@common/base/base.entity';

/**
 * A manual, point-in-time copy of one campaign's prize data from
 * SwapConnect's Partner API (`GET /campaigns/:id` — see SwapConnectClient).
 * Only ever one live row: SwapConnectIntegrationService.sync() always
 * updates the latest row rather than inserting a new one, so there's never
 * ambiguity about "the" current prize. No images column — the partner API
 * doesn't expose prize images to partners, only name/state, so this stays
 * honest about what SwapConnect actually hands back rather than inventing a
 * field that would always be empty.
 */
@Entity('campaign_prize_snapshots')
export class CampaignPrizeSnapshot extends BaseEntity {
  @Column({ name: 'swapconnect_campaign_id', type: 'text' })
  swapConnectCampaignId: string;

  @Column({ name: 'campaign_name', type: 'text' })
  campaignName: string;

  @Column({ name: 'campaign_summary', type: 'text', nullable: true })
  campaignSummary?: string | null;

  @Column({ name: 'campaign_external_url', type: 'text', nullable: true })
  campaignExternalUrl?: string | null;

  @Column({ name: 'campaign_item_id', type: 'text', nullable: true })
  campaignItemId?: string | null;

  @Column({ name: 'prize_name', type: 'text', nullable: true })
  prizeName?: string | null;

  @Column({ name: 'prize_state', type: 'text', nullable: true })
  prizeState?: string | null;

  @Column({ name: 'synced_at', type: 'timestamptz' })
  syncedAt: Date;

  @Column({ name: 'synced_by_admin_id', type: 'uuid' })
  syncedByAdminId: string;
}
