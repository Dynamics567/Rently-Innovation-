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
  VerificationDocumentReviewed: 'verification_document.reviewed',
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
}

export interface VerificationDocumentReviewedEventPayload {
  recipientId: string;
  docType: string;
  status: string;
  reviewNotes?: string | null;
}
