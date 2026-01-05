import { parseDKBPDF } from './dkb-pdf-parser.ts';
import { parseDKBCSV } from '../csv/dkb-csv-parser.ts';
import type { ParseResult } from './types.ts';

/**
 * Main DKB parser that auto-detects format (CSV vs PDF) and routes to appropriate parser
 */
export function parseDKB(input: string): ParseResult {
  // Detect CSV format: starts with "Miles & More Gold Credit Card" header
  if (input.startsWith('Miles & More Gold Credit Card')) {
    return parseDKBCSV(input);
  }

  // Detect PDF format: contains statement date range
  if (input.includes('Ihre Abrechnung vom')) {
    return parseDKBPDF(input);
  }

  // Unable to detect format
  throw new Error('Unknown DKB format: file does not match CSV or PDF patterns');
}
