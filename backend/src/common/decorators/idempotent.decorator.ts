import { SetMetadata } from '@nestjs/common';

export const IDEMPOTENT_KEY = 'idempotent';

/**
 * Marks a mutating endpoint as requiring an `Idempotency-Key` header —
 * see docs/API_DESIGN.md. Applied to POST /bookings and POST
 * /bookings/:id/payments/initiate: a slow network causing a client to retry
 * a "Pay" tap must replay the original response, not create a second
 * booking or a second charge.
 */
export const Idempotent = () => SetMetadata(IDEMPOTENT_KEY, true);
