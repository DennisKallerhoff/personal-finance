import { parseGermanAmount } from '../german-numbers.ts';
import { parseGermanDate, formatISODate } from '../german-dates.ts';
import type { ParsedTransaction, ParseResult, ParseWarning } from '../pdf/types.ts';

// CSV column indices (0-based)
const COLS = {
  BUCHUNG: 0,           // Booking date
  VALUTA: 1,            // Value date
  EMPFAENGER: 2,        // Sender/Recipient
  BUCHUNGSTEXT: 3,      // Transaction type
  VERWENDUNGSZWECK: 4,  // Purpose/Description
  SALDO: 5,             // Balance
  WAEHRUNG_SALDO: 6,    // Currency (balance)
  BETRAG: 7,            // Amount
  WAEHRUNG_BETRAG: 8,   // Currency (amount)
} as const;

// Header row identifier
const HEADER_MARKER = 'Buchung;Wertstellungsdatum;Auftraggeber/Empf';

// Rows to skip (metadata)
const SKIP_MARKERS = [
  'Umsatzanzeige;',
  'IBAN;',
  'Kontoname;',
  'Bank;',
  'Kunde;',
  'Zeitraum;',
  'Saldo;',
  'Sortierung;',
  'In der CSV-Datei',
];

export function parseINGCsv(text: string): ParseResult {
  const lines = text.split('\n');
  const transactions: ParsedTransaction[] = [];
  const warnings: ParseWarning[] = [];

  let headerFound = false;
  let accountNumber: string | undefined;
  let statementPeriod: string | undefined;
  let rowsParsed = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const lineNumber = i + 1;

    // Skip empty lines
    if (!line) continue;

    // Extract metadata from header rows
    if (line.startsWith('IBAN;')) {
      accountNumber = line.split(';')[1]?.replace(/\s/g, '');
      continue;
    }
    if (line.startsWith('Zeitraum;')) {
      statementPeriod = line.split(';')[1];
      continue;
    }

    // Skip metadata rows
    if (SKIP_MARKERS.some(marker => line.startsWith(marker))) {
      continue;
    }

    // Detect header row
    if (line.includes(HEADER_MARKER)) {
      headerFound = true;
      continue;
    }

    // Skip until we find the header
    if (!headerFound) continue;

    // Parse data row
    try {
      const transaction = parseDataRow(line, lineNumber, warnings);
      if (transaction) {
        transactions.push(transaction);
        rowsParsed++;
      }
    } catch (e) {
      warnings.push({
        line: lineNumber,
        message: e instanceof Error ? e.message : 'Parse error',
        raw: line
      });
    }
  }

  return {
    transactions,
    warnings,
    metadata: {
      bank: 'ing',
      format: 'csv',
      account_number: accountNumber,
      statement_period: statementPeriod,
      rows_parsed: rowsParsed,
      raw_lines: lines.length
    }
  };
}

function parseDataRow(
  line: string,
  lineNumber: number,
  warnings: ParseWarning[]
): ParsedTransaction | null {
  // Split by semicolon
  const cols = line.split(';');

  // Need at least 8 columns for a valid row
  if (cols.length < 8) {
    return null;
  }

  const dateStr = cols[COLS.BUCHUNG]?.trim();
  const vendor = cols[COLS.EMPFAENGER]?.trim() || '';
  const type = cols[COLS.BUCHUNGSTEXT]?.trim() || '';
  const description = cols[COLS.VERWENDUNGSZWECK]?.trim() || '';
  const amountStr = cols[COLS.BETRAG]?.trim();

  // Skip rows without a valid date
  if (!dateStr || !/^\d{2}\.\d{2}\.\d{4}$/.test(dateStr)) {
    return null;
  }

  // Skip "Abschluss" rows with no vendor (these are just balance entries)
  if (type === 'Abschluss' && !vendor) {
    return null;
  }

  // Parse date
  const date = parseGermanDate(dateStr);
  const isoDate = formatISODate(date);

  // Parse amount
  if (!amountStr) {
    warnings.push({
      line: lineNumber,
      message: 'No amount found',
      raw: line
    });
    return null;
  }

  const amount = parseGermanAmount(amountStr);
  const direction: 'debit' | 'credit' = amount < 0 ? 'debit' : 'credit';

  // Use vendor, or fall back to type if vendor is empty
  const rawVendor = vendor || type;

  return {
    date: isoDate,
    amount: Math.abs(amount),
    direction,
    raw_vendor: rawVendor,
    description,
    type: type || undefined,
    metadata: {}
  };
}
