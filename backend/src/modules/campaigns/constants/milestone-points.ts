import { ReferralMilestoneType } from '../enums/referral-milestone-type.enum';

/** Brief §7's official scoring model — max 25 points per qualified referral (5+5+5+10), enforced structurally since each milestone can only ever fire once per referral (see ReferralMilestone's unique index). */
export const MILESTONE_POINTS: Record<ReferralMilestoneType, number> = {
  [ReferralMilestoneType.PROVIDER_REGISTERED]: 5,
  [ReferralMilestoneType.PROVIDER_VERIFIED]: 5,
  [ReferralMilestoneType.LISTING_APPROVED]: 5,
  [ReferralMilestoneType.FIRST_GENUINE_INQUIRY]: 10,
};

export const MAX_POINTS_PER_REFERRAL = 25;
