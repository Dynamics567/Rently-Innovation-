/** Brief §4's exact lifecycle: Pending → Approved → Active → Suspended → Disqualified. */
export enum AmbassadorStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  DISQUALIFIED = 'disqualified',
}
