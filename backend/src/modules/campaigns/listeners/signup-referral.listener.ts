import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DomainEvents, UserSignedUpEventPayload } from '@common/events/domain-events';
import { ReferralAttributionService } from '../services/referral-attribution.service';
import { ReferralSource } from '../enums/referral-source.enum';

/** The one place AuthService.signup()'s referralCode actually gets resolved — Identity never imports Campaigns (module-boundary rule); this listens on the shared event bus instead. */
@Injectable()
export class SignupReferralListener {
  private readonly logger = new Logger(SignupReferralListener.name);

  constructor(private readonly referralAttributionService: ReferralAttributionService) {}

  @OnEvent(DomainEvents.UserSignedUp)
  async onUserSignedUp(payload: UserSignedUpEventPayload): Promise<void> {
    if (!payload.referralCode) return;
    try {
      await this.referralAttributionService.attribute(payload.referralCode, payload.userId, ReferralSource.LINK);
    } catch (err) {
      // A bad/unknown code, a self-referral, or an already-attributed
      // account must never block an otherwise-valid signup — see
      // SignupDto.referralCode's own doc comment.
      this.logger.warn(`Referral attribution skipped for user ${payload.userId}: ${(err as Error).message}`);
    }
  }
}
