export const PAYMENT_PORT = Symbol('PAYMENT_PORT');

export interface ChargeResult {
  providerReference: string;
}

/**
 * Adapter boundary for payment capture/refund/release — the
 * `PaymentProviderPort` described in docs/ARCHITECTURE.md. BookingService
 * depends on this interface, never on Paystack/Flutterwave directly, so the
 * whole booking lifecycle (create → approve → handover → return → release
 * deposit) can be built and demoed end-to-end against `MockPaymentAdapter`
 * now, and swapped for a real `PaystackAdapter` (Payments phase, see the
 * Phase 1 plan's roadmap) without touching a single line of booking logic.
 */
export interface PaymentPort {
  charge(params: { bookingId: string; amountMinor: number }): Promise<ChargeResult>;
  refund(params: { bookingId: string; amountMinor: number; reason?: string }): Promise<void>;
  release(params: { bookingId: string; amountMinor: number }): Promise<void>;
}

/** Succeeds immediately, in-memory — no real money moves. Development/demo only. */
export class MockPaymentAdapter implements PaymentPort {
  async charge(params: { bookingId: string; amountMinor: number }): Promise<ChargeResult> {
    return { providerReference: `MOCK-CHG-${params.bookingId}-${Date.now()}` };
  }

  async refund(): Promise<void> {
    // no-op — nothing to reverse against a mock charge
  }

  async release(): Promise<void> {
    // no-op — nothing to pay out against a mock charge
  }
}
