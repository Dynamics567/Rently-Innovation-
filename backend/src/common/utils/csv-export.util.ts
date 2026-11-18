import { Response } from 'express';

export interface CsvColumn<T> {
  header: string;
  value: (row: T) => string | number | null | undefined;
}

/**
 * Zero precedent elsewhere in the backend — the first CSV export anywhere
 * in this codebase (see Campaigns Phase 7). A leading UTF-8 BOM keeps Excel
 * from mangling non-ASCII characters (ambassador names); any cell starting
 * with =,+,-,@ gets a leading apostrophe so Excel/Sheets never evaluates it
 * as a formula (CSV formula injection — a referral code or reason an
 * ambassador chose themselves is untrusted input).
 */
const FORMULA_PREFIX_CHARS = ['=', '+', '-', '@', '\t', '\r'];

function escapeCell(value: string | number | null | undefined): string {
  let cell = value === null || value === undefined ? '' : String(value);
  if (cell.length && FORMULA_PREFIX_CHARS.includes(cell[0])) {
    cell = `'${cell}`;
  }
  if (/[",\n\r]/.test(cell)) {
    cell = `"${cell.replace(/"/g, '""')}"`;
  }
  return cell;
}

export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const header = columns.map((c) => escapeCell(c.header)).join(',');
  const lines = rows.map((row) => columns.map((c) => escapeCell(c.value(row))).join(','));
  return '﻿' + [header, ...lines].join('\r\n') + '\r\n';
}

/**
 * Writes the CSV directly onto the raw response (`@Res()`, no passthrough)
 * and bypasses TransformInterceptor's `{data,meta}` envelope entirely —
 * the one kind of endpoint in this codebase that isn't JSON.
 */
export function sendCsv(res: Response, filename: string, csv: string): void {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}"`,
  );
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).send(csv);
}
