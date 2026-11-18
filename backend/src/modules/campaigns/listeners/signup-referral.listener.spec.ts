import { SignupReferralListener } from './signup-referral.listener';
import { ReferralAttributionService } from '../services/referral-attribution.service';
import { ReferralFraudFlagService } from '../services/referral-fraud-flag.service';
import { DomainException } from '@common/errors/domain.exception';
import { ErrorCode } from '@common/errors/error-codes.enum';

describe('SignupReferralListener', () => {
  let attributionService: Record<'attribute', jest.Mock>;
  let fraudFlagService: Record<'flag', jest.Mock>;
  let listener: SignupReferralListener;

  beforeEach(() => {
    attributionService = { attribute: jest.fn(async () => ({ id: 'attribution-1' })) };
    fraudFlagService = { flag: jest.fn(async () => undefined) };
    listener = new SignupReferralListener(
      attributionService as unknown as ReferralAttributionService,
      fraudFlagService as unknown as ReferralFraudFlagService,
    );
  });

  it('does nothing when the signup carried no referral code', async () => {
    await listener.onUserSignedUp({ userId: 'user-1', referralCode: null } as any);
    expect(attributionService.attribute).not.toHaveBeenCalled();
    expect(fraudFlagService.flag).not.toHaveBeenCalled();
  });

  it('attributes a valid code without ever flagging it', async () => {
    await listener.onUserSignedUp({ userId: 'user-1', referralCode: 'ABC123' } as any);
    expect(attributionService.attribute).toHaveBeenCalledWith('ABC123', 'user-1', 'link');
    expect(fraudFlagService.flag).not.toHaveBeenCalled();
  });

  it('records a fraud flag instead of just logging, and never lets the rejection escape to break the signup', async () => {
    attributionService.attribute.mockRejectedValue(
      DomainException.conflict(
        ErrorCode.REFERRAL_SELF_REFERRAL,
        'An ambassador cannot refer themselves.',
      ),
    );

    await expect(
      listener.onUserSignedUp({ userId: 'user-1', referralCode: 'ABC123' } as any),
    ).resolves.toBeUndefined();

    expect(fraudFlagService.flag).toHaveBeenCalledWith({
      referralCode: 'ABC123',
      attemptedUserId: 'user-1',
      reasonCode: ErrorCode.REFERRAL_SELF_REFERRAL,
      message: 'An ambassador cannot refer themselves.',
    });
  });
});
