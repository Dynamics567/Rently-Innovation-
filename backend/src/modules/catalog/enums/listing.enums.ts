export enum PriceUnit {
  HOUR = 'hour',
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
}

export enum ListingCondition {
  NEW = 'new',
  LIKE_NEW = 'like_new',
  GOOD = 'good',
  FAIR = 'fair',
}

export enum CancellationPolicy {
  FLEXIBLE = 'flexible',
  MODERATE = 'moderate',
  STRICT = 'strict',
}

export enum BookingMode {
  INSTANT = 'instant',
  REQUEST = 'request',
}

export enum ListingStatus {
  DRAFT = 'draft',
  PENDING_REVIEW = 'pending_review',
  LIVE = 'live',
  PAUSED = 'paused',
  REJECTED = 'rejected',
}

/**
 * Provider-controlled availability toggle for one physical unit of a
 * listing (see Asset entity). Deliberately does NOT track "is this unit
 * out on rental right now" — that's derived at query time from its
 * bookings, never stored here, so it can't drift from the real booking
 * state (same "ledger over balance" philosophy as everything else
 * money/state-adjacent in this codebase).
 */
export enum AssetProviderStatus {
  ACTIVE = 'active',
  MAINTENANCE = 'maintenance',
  RETIRED = 'retired',
}
