export enum ReferralStatus {
  PENDING = 'pending',
  QUALIFIED = 'qualified',
  REJECTED = 'rejected',
  /** No reverse() action exists yet — lands with the points ledger in Phase 3/7. */
  REVERSED = 'reversed',
}
