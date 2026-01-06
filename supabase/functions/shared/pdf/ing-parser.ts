import { parseINGPDF } from './ing-pdf-parser.ts';
import { parseINGCsv } from '../csv/ing-csv-parser.ts';
import type { ParseResult } from './types.ts';

/**
 * Main ING parser that auto-detects format (CSV vs PDF) and routes to appropriate parser
 */
export function parseING(input: string): ParseResult {
  // Detect CSV format: starts with "Umsatzanzeige;" header or contains CSV markers
  if (input.startsWith('Umsatzanzeige;') ||
      input.includes('Kontoname;Girokonto') ||
      input.includes('Buchung;Wertstellungsdatum;Auftraggeber')) {
    return parseINGCsv(input);
  }

  // Detect PDF format: contains statement markers
  if (input.includes('Girokonto Nummer') ||
      input.includes('Kontoauszug') ||
      input.includes('Buchung  Buchung')) {
    return parseINGPDF(input);
  }

  // Unable to detect format - try CSV first as it's more structured
  if (input.includes(';')) {
    return parseINGCsv(input);
  }

  // Fall back to PDF parser
  return parseINGPDF(input);
}
