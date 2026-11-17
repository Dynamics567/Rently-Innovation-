/**
 * Brief §8's onboarding pipeline: Registration → Verification → Listing
 * Approval → First Genuine Rental Inquiry. No points column yet — see
 * ReferralMilestone's own doc comment.
 */
export enum ReferralMilestoneType {
  PROVIDER_REGISTERED = 'provider_registered',
  PROVIDER_VERIFIED = 'provider_verified',
  LISTING_APPROVED = 'listing_approved',
  FIRST_GENUINE_INQUIRY = 'first_genuine_inquiry',
}
