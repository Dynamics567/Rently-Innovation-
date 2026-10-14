/**
 * Every value here corresponds to a real event that already happens on a
 * booking today (see PaymentPort's charge/refund/release calls in
 * BookingService) or a real gap this module closes (PROVIDER_EARNING,
 * PROVIDER_FORFEIT_CREDIT — see FinanceService's doc comment). None of these
 * represent a simulated event; this is the permanent record of real money
 * movements that were previously ephemeral.
 */
export enum TransactionType {
  CHARGE = 'charge',
  REFUND = 'refund',
  DEPOSIT_RELEASE = 'deposit_release',
  PROVIDER_EARNING = 'provider_earning',
  PROVIDER_FORFEIT_CREDIT = 'provider_forfeit_credit',
}
