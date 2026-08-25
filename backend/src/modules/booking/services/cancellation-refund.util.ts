import { CancellationPolicy } from '@modules/catalog/enums/listing.enums';

const HOUR_MS = 60 * 60 * 1000;

/**
 * Proration tiers by time-before-pickup, per cancellation policy. The
 * deposit is never prorated — it isn't compensation for lost booking time,
 * it's security against damage that hasn't happened yet, so a cancelled
 * booking always gets 100% of its deposit back regardless of timing.
 * Proration applies only to `rentalFeeMinor + serviceFeeMinor`.
 */
function refundPctFor(policy: CancellationPolicy, hoursBeforeStart: number): number {
  switch (policy) {
    case CancellationPolicy.FLEXIBLE:
      return hoursBeforeStart >= 24 ? 1 : 0.5;
    case CancellationPolicy.MODERATE:
      if (hoursBeforeStart >= 72) return 1;
      if (hoursBeforeStart >= 24) return 0.5;
      return 0;
    case CancellationPolicy.STRICT:
      return hoursBeforeStart >= 7 * 24 ? 1 : 0;
  }
}

export interface CancellationRefund {
  refundMinor: number;
  refundPct: number;
  penaltyMinor: number;
}

export function computeCancellationRefund(
  policy: CancellationPolicy,
  startsAt: Date,
  cancelledAt: Date,
  totalMinor: number,
  depositMinor: number,
): CancellationRefund {
  const hoursBeforeStart = Math.max(0, (startsAt.getTime() - cancelledAt.getTime()) / HOUR_MS);
  const refundPct = refundPctFor(policy, hoursBeforeStart);
  const prorationBaseMinor = totalMinor - depositMinor;
  const refundMinor = depositMinor + Math.round(prorationBaseMinor * refundPct);
  return { refundMinor, refundPct, penaltyMinor: totalMinor - refundMinor };
}
