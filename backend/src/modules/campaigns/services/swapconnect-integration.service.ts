import { Inject, Injectable, Optional } from '@nestjs/common';
import { DomainException } from '@common/errors/domain.exception';
import { ErrorCode } from '@common/errors/error-codes.enum';
import { AuditLogService } from '@common/audit/audit-log.service';
import { AuditActorType } from '@common/audit/audit-actor-type.enum';
import { CampaignPrizeSnapshotRepository } from '../repositories/campaign-prize-snapshot.repository';
import { CampaignPrizeSnapshot } from '../entities/campaign-prize-snapshot.entity';
import { SwapConnectClient } from './swapconnect-client';

export const SWAPCONNECT_CLIENT = 'SWAPCONNECT_CLIENT';

export interface SwapConnectStatus {
  configured: boolean;
  partner: { id: string; name: string; status: string } | null;
  lastSyncedAt: Date | null;
}

/**
 * Phase 5 — the SwapConnect-facing leg of the campaign, scoped exactly to
 * the plan: a manual "sync now" admin action that pulls the prize snapshot
 * from SwapConnect's Partner API and stores it, plus a plain status read.
 * No live webhook receiver yet (that's Phase 6, once SWAPCONNECT_WEBHOOK_SECRET
 * is actually in place to verify signatures against) — this never fabricates
 * a "connected" state when `client` is null.
 */
@Injectable()
export class SwapConnectIntegrationService {
  constructor(
    @Optional() @Inject(SWAPCONNECT_CLIENT) private readonly client: SwapConnectClient | null,
    private readonly snapshotRepository: CampaignPrizeSnapshotRepository,
    private readonly auditLogService: AuditLogService,
  ) {}

  async getStatus(): Promise<SwapConnectStatus> {
    const latest = await this.snapshotRepository.getLatest();
    if (!this.client) {
      return { configured: false, partner: null, lastSyncedAt: latest?.syncedAt ?? null };
    }
    const me = await this.client.getMe();
    return { configured: true, partner: me.partner, lastSyncedAt: latest?.syncedAt ?? null };
  }

  /** Public, unauthenticated shape for the campaign landing page — null when nothing has ever been synced. */
  async getPublicSnapshot(): Promise<CampaignPrizeSnapshot | null> {
    return this.snapshotRepository.getLatest();
  }

  async sync(adminId: string): Promise<CampaignPrizeSnapshot> {
    if (!this.client) {
      throw DomainException.conflict(
        ErrorCode.SWAPCONNECT_NOT_CONFIGURED,
        'SwapConnect partner credentials are not configured yet.',
      );
    }
    const campaign = await this.client.getCampaign();
    const prize = campaign.prizes[0] ?? null;

    const existing = await this.snapshotRepository.getLatest();
    const before = existing ? { ...existing } : null;
    const row = existing ?? this.snapshotRepository.create({});
    Object.assign(row, {
      swapConnectCampaignId: campaign.id,
      campaignName: campaign.name,
      campaignSummary: campaign.summary,
      campaignExternalUrl: campaign.externalUrl,
      campaignItemId: prize?.campaignItemId ?? null,
      prizeName: prize?.name ?? null,
      prizeState: prize?.state ?? null,
      syncedAt: new Date(),
      syncedByAdminId: adminId,
    });
    const saved = await this.snapshotRepository.save(row);

    await this.auditLogService.record({
      actorId: adminId,
      actorType: AuditActorType.ADMIN,
      action: 'campaign_prize_snapshot.sync',
      entityType: 'CampaignPrizeSnapshot',
      entityId: saved.id,
      before,
      after: { campaignName: saved.campaignName, prizeName: saved.prizeName },
    });
    return saved;
  }
}
