/** Coarse authorization/business-rule state — docs/DATABASE_SCHEMA.md. */
export enum BookingStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  DECLINED = 'declined',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
  DISPUTED = 'disputed',
}

/**
 * Granular UI-facing progress state — the exact 12-key sequence from the
 * frontend prototype's STAGES model (prototype/assets/rently.js), kept
 * alongside `status` (not replacing it) so booking.html's timeline can
 * eventually render from real data with zero change to its stage-key
 * vocabulary. See the Phase 1 plan's "deliberate deviations" section.
 */
export enum BookingStage {
  REQUESTED = 'requested',
  ACCEPTED = 'accepted',
  PAYMENT = 'payment',
  RESERVED = 'reserved',
  READY = 'ready',
  PICKEDUP = 'pickedup',
  ACTIVE = 'active',
  RETURNSCHED = 'returnsched',
  RETURNED = 'returned',
  INSPECTED = 'inspected',
  DEPOSITRELEASED = 'depositreleased',
  COMPLETED = 'completed',
}

export const BOOKING_STAGE_ORDER: BookingStage[] = [
  BookingStage.REQUESTED,
  BookingStage.ACCEPTED,
  BookingStage.PAYMENT,
  BookingStage.RESERVED,
  BookingStage.READY,
  BookingStage.PICKEDUP,
  BookingStage.ACTIVE,
  BookingStage.RETURNSCHED,
  BookingStage.RETURNED,
  BookingStage.INSPECTED,
  BookingStage.DEPOSITRELEASED,
  BookingStage.COMPLETED,
];
