/**
 * Builds a Postgres `tstzrange` literal, e.g. `[2026-01-01T10:00:00.000Z,2026-01-05T17:00:00.000Z)`
 * — half-open (inclusive start, exclusive end) so a return at 17:00 and the
 * next rental's pickup at 17:00 don't count as overlapping.
 */
export function toTstzRangeLiteral(from: Date, to: Date): string {
  return `[${from.toISOString()},${to.toISOString()})`;
}
