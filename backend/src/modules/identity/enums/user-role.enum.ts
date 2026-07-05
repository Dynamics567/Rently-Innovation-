/**
 * A user's `roles` column is an array — per PRD §8, a person can be both a
 * Renter and a Provider simultaneously. RBAC checks (@Roles guard) treat
 * this as "does the user hold ANY of the required roles," never "IS the
 * user's single role."
 */
export enum UserRole {
  RENTER = 'renter',
  PROVIDER = 'provider',
  PROVIDER_STAFF = 'provider_staff',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin',
}
