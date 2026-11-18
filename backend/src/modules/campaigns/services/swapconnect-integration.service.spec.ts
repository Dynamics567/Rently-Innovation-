import { SwapConnectIntegrationService } from './swapconnect-integration.service';
import { CampaignPrizeSnapshotRepository } from '../repositories/campaign-prize-snapshot.repository';
import { AuditLogService } from '@common/audit/audit-log.service';
import { SwapConnectClient } from './swapconnect-client';
import { DomainException } from '@common/errors/domain.exception';

describe('SwapConnectIntegrationService', () => {
  let snapshotRepository: Record<'getLatest' | 'create' | 'save', jest.Mock>;
  let auditLogService: Record<'record', jest.Mock>;

  beforeEach(() => {
    snapshotRepository = {
      getLatest: jest.fn(async () => null),
      create: jest.fn((partial) => partial),
      save: jest.fn(async (entity) => ({ ...entity, id: 'snapshot-1' })),
    };
    auditLogService = { record: jest.fn(async () => undefined) };
  });

  function build(client: SwapConnectClient | null) {
    return new SwapConnectIntegrationService(
      client,
      snapshotRepository as unknown as CampaignPrizeSnapshotRepository,
      auditLogService as unknown as AuditLogService,
    );
  }

  describe('getStatus', () => {
    it('reports not configured, with no partner call, when no client was constructed', async () => {
      const service = build(null);

      const status = await service.getStatus();

      expect(status).toEqual({ configured: false, partner: null, lastSyncedAt: null });
    });

    it('reports configured and the partner identity when a client exists', async () => {
      const client = {
        getMe: jest.fn(async () => ({ partner: { id: 'p1', name: 'Rently', status: 'ACTIVE' } })),
      };
      const service = build(client as unknown as SwapConnectClient);

      const status = await service.getStatus();

      expect(status).toEqual({
        configured: true,
        partner: { id: 'p1', name: 'Rently', status: 'ACTIVE' },
        lastSyncedAt: null,
      });
    });
  });

  describe('sync', () => {
    it('refuses to sync when credentials are missing, never faking a successful sync', async () => {
      const service = build(null);

      await expect(service.sync('admin-1')).rejects.toThrow(DomainException);
      expect(snapshotRepository.save).not.toHaveBeenCalled();
    });

    it('pulls the campaign and its first prize from SwapConnect and upserts the snapshot', async () => {
      const client = {
        getCampaign: jest.fn(async () => ({
          id: 'camp-1',
          name: 'Refer, Onboard & Win',
          summary: 'Win an Airtel Outdoor Unit',
          externalUrl: 'https://swapconnect.africa/c/refer-onboard-win',
          prizes: [{ campaignItemId: 'item-1', name: 'Airtel Outdoor Unit', state: 'LIVE' }],
        })),
      };
      const service = build(client as unknown as SwapConnectClient);

      const saved = await service.sync('admin-1');

      expect(saved).toMatchObject({
        id: 'snapshot-1',
        swapConnectCampaignId: 'camp-1',
        campaignName: 'Refer, Onboard & Win',
        campaignItemId: 'item-1',
        prizeName: 'Airtel Outdoor Unit',
        syncedByAdminId: 'admin-1',
      });
      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'campaign_prize_snapshot.sync', entityId: 'snapshot-1' }),
      );
    });
  });
});
