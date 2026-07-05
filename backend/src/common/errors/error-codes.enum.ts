/**
 * Machine-readable error codes returned to clients. The frontend switches on
 * `error.code`, never on `error.message` — messages can be reworded for
 * localization/tone without breaking client logic that depends on them.
 *
 * Convention: DOMAIN_CONDITION, uppercase snake case, one enum per bounded
 * context so codes never collide across modules.
 */
export enum ErrorCode {
  // Generic
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  FORBIDDEN = 'FORBIDDEN',
  UNAUTHENTICATED = 'UNAUTHENTICATED',
  RATE_LIMITED = 'RATE_LIMITED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  IDEMPOTENCY_KEY_REQUIRED = 'IDEMPOTENCY_KEY_REQUIRED',
  IDEMPOTENCY_KEY_CONFLICT = 'IDEMPOTENCY_KEY_CONFLICT',

  // Identity
  EMAIL_ALREADY_REGISTERED = 'EMAIL_ALREADY_REGISTERED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  OTP_INVALID_OR_EXPIRED = 'OTP_INVALID_OR_EXPIRED',
  ACCOUNT_SUSPENDED = 'ACCOUNT_SUSPENDED',
  PROVIDER_NOT_VERIFIED = 'PROVIDER_NOT_VERIFIED',
  REFRESH_TOKEN_INVALID = 'REFRESH_TOKEN_INVALID',

  // Catalog (reserved for the Catalog module)
  LISTING_NOT_LIVE = 'LISTING_NOT_LIVE',
  CATEGORY_ATTRIBUTE_INVALID = 'CATEGORY_ATTRIBUTE_INVALID',

  // Booking (reserved for the Booking module)
  BOOKING_DATES_UNAVAILABLE = 'BOOKING_DATES_UNAVAILABLE',
  BOOKING_INVALID_STATE_TRANSITION = 'BOOKING_INVALID_STATE_TRANSITION',
}
