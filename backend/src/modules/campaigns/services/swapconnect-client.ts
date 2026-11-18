import { Logger } from '@nestjs/common';
import { SwapConnectConfig } from '@config/configuration';

export interface SwapConnectPrize {
  campaignItemId: string;
  name: string | null;
  state: string | null;
}

export interface SwapConnectCampaign {
  id: string;
  name: string;
  summary: string | null;
  externalUrl: string | null;
  prizes: SwapConnectPrize[];
}

/**
 * Thin wrapper over SwapConnect's documented Partner API v1
 * (`{apiBase}/api/v1/partner`, `Authorization: Bearer <key>`, responses
 * shaped `{success, data}` or `{success:false, message}`) — Rently's first
 * generic outbound HTTP client, built on the platform's native fetch since
 * no SDK exists for this API and axios isn't a dependency anywhere else.
 * Only ever constructed when apiBase/partnerApiKey/campaignId are all
 * present — see CampaignsModule's SWAPCONNECT_CLIENT factory.
 */
export class SwapConnectClient {
  private readonly logger = new Logger(SwapConnectClient.name);

  constructor(
    private readonly config: Required<
      Pick<SwapConnectConfig, 'apiBase' | 'partnerApiKey' | 'campaignId'>
    >,
  ) {}

  async getMe(): Promise<{ partner: { id: string; name: string; status: string } }> {
    return this.request('/me');
  }

  async getCampaign(): Promise<SwapConnectCampaign> {
    return this.request(`/campaigns/${encodeURIComponent(this.config.campaignId)}`);
  }

  private async request<T>(path: string): Promise<T> {
    const url = `${this.config.apiBase.replace(/\/+$/, '')}/api/v1/partner${path}`;
    let res: Response;
    try {
      res = await fetch(url, {
        method: 'GET',
        headers: { Authorization: `Bearer ${this.config.partnerApiKey}` },
      });
    } catch (err) {
      this.logger.error(`SwapConnect request to ${path} failed: ${(err as Error).message}`);
      throw new Error('Could not reach SwapConnect.');
    }
    const body = await res.json().catch(() => null);
    if (!res.ok || !body?.success) {
      const message = body?.message ?? `SwapConnect API error (${res.status})`;
      this.logger.error(`${path} -> ${res.status}: ${message}`);
      throw new Error(message);
    }
    return body.data as T;
  }
}
