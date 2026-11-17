/**
 * Names for the in-process event bus (EventEmitterModule.forRoot(), see
 * app.module.ts). A shared leaf file, not owned by any one module — Booking/
 * Identity/Catalog emit these after their own transactions resolve;
 * NotificationsModule listens (see listeners/domain-events.listener.ts).
 * Payloads carry only ids plus whatever display text the emitting call site
 * already had loaded (a listing title, a business name) — NotificationsModule
 * never imports BookingModule to look anything else up, only Identity (to
 * resolve a recipient's email) via its own exported UsersService.
 */
export const DomainEvents = {
  BookingCreated: 'booking.created',
  BookingApproved: 'booking.approved',
  BookingDeclined: 'booking.declined',
  BookingCancelled: 'booking.cancelled',
  BookingHandedOver: 'booking.handed_over',
  BookingReturned: 'booking.returned',
  BookingDepositReleased: 'booking.deposit_released',
  BookingDisputed: 'booking.disputed',
  BookingDisputeResolved: 'booking.dispute_resolved',
  BookingExtensionRequested: 'booking.extension_requested',
  BookingExtensionApproved: 'booking.extension_approved',
  BookingExtensionDeclined: 'booking.extension_declined',
  BookingExtensionCancelled: 'booking.extension_cancelled',
  ProviderVerified: 'provider.verified',
  ProviderRejected: 'provider.rejected',
  ListingApproved: 'listing.approved',
  ListingRejected: 'listing.rejected',
  ListingSubmitted: 'listing.submitted',
  ListingChangesRequested: 'listing.changes_requested',
  ListingFlagged: 'listing.flagged',
  VerificationDocumentReviewed: 'verification_document.reviewed',
  ProviderProfileCreated: 'provider_profile.created',
  UserSignedUp: 'user.signed_up',
  AmbassadorRegistered: 'ambassador.registered',
  AmbassadorApproved: 'ambassador.approved',
  ReferralAttributed: 'referral.attributed',
  ReferralMilestoneAchieved: 'referral.milestone_achieved',
  ReferralRejected: 'referral.rejected',
} as const;

/** Shared shape for every booking-lifecycle event — one loose interface rather than 13 near-identical ones. */
export interface BookingLifecycleEventPayload {
  bookingId: string;
  recipientId: string;
  listingTitle: string;
  reason?: string | null;
  finalDeductionMinor?: number;
  requestedEndsAt?: string;
}

export interface ProviderVerificationEventPayload {
  recipientId: string;
  businessName: string | null;
}

export interface ProviderRejectedEventPayload extends ProviderVerificationEventPayload {
  reason: string;
}

export interface ListingModerationEventPayload {
  recipientId: string;
  listingId: string;
  listingTitle: string;
  reason?: string | null;
}

export interface ListingFlaggedEventPayload {
  recipientId: string;
  listingId: string;
  listingTitle: string;
  reason: string;
  /** Which thing was actually flagged — the whole listing, or one of its photos. */
  scope: 'listing' | 'image';
}

export interface VerificationDocumentReviewedEventPayload {
  recipientId: string;
  docType: string;
  status: string;
  reviewNotes?: string | null;
}

/** Internal signal only — no NotificationType/listener in NotificationsModule reacts to this; it exists purely for Campaigns' milestone listener to react to provider-profile creation without Identity importing Campaigns. */
export interface ProviderProfileCreatedEventPayload {
  userId: string;
}

/** Emitted on every signup, referralCode null unless one was supplied — Campaigns' signup listener no-ops when it's null. */
export interface UserSignedUpEventPayload {
  userId: string;
  referralCode: string | null;
}

export interface AmbassadorRegisteredEventPayload {
  recipientId: string;
}

export interface AmbassadorApprovedEventPayload {
  recipientId: string;
}

export interface ReferralAttributedEventPayload {
  /** The ambassador's own userId — they're the one notified "referral successfully registered." */
  recipientId: string;
}

export interface ReferralMilestoneAchievedEventPayload {
  recipientId: string;
  milestoneType: string;
}

export interface ReferralRejectedEventPayload {
  recipientId: string;
  reason: string;
}
