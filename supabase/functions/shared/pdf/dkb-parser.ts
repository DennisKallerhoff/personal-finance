import { parseGermanAmount } from '../german-numbers.ts';
import { parseGermanDate, formatISODate } from '../german-dates.ts';
import type { ParsedTransaction, ParseResult, ParseWarning } from './types.ts';

// DKB uses DD.MM.YY format
const DATE_PATTERN = /^(\d{2}\.\d{2}\.\d{2})\s+(\d{2}\.\d{2}\.\d{2})/;
const SINGLE_DATE_PATTERN = /^\s*(\d{2}\.\d{2}\.\d{2})/;
const AMOUNT_PATTERN = /(\d{1,3}(?:\.\d{3})*,\d{2})\s*([-+])\s*$/;

const SKIP_PATTERNS = [
  'Prämienmeilen',
  'Übertrag von Seite',
  'Zwischensumme von Seite',
  'Saldo letzte Abrechnung',
  'Neuer Saldo',
  'Ihre Abrechnung vom',
  'Datum    Datum',
  'Beleg    Buchung'
];

interface ParserState {
  inTransaction: boolean;
  currentTransaction: Partial<ParsedTransaction> | null;
}

export function parseDKB(text: string): ParseResult {
  const lines = text.split('\n');
  const transactions: ParsedTransaction[] = [];
  const warnings: ParseWarning[] = [];

  let state: ParserState = {
    inTransaction: false,
    currentTransaction: null
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1;

    // Skip known non-transaction lines
    if (shouldSkipLine(line)) {
      continue;
    }

    // Check for transaction with two dates (receipt + booking)
    const twoDatesMatch = line.match(DATE_PATTERN);

    if (twoDatesMatch) {
      // Save previous transaction
      if (state.currentTransaction && isValidTransaction(state.currentTransaction)) {
        transactions.push(state.currentTransaction as ParsedTransaction);
      }

      try {
        state.currentTransaction = parseTwoDateLine(line, lineNumber, warnings);
        state.inTransaction = true;
      } catch (e) {
        warnings.push({
          line: lineNumber,
          message: e instanceof Error ? e.message : 'Parse error',
          raw: line
        });
        state.inTransaction = false;
        state.currentTransaction = null;
      }
      continue;
    }

    // Check for single date transaction (e.g., Lastschrift payment)
    const singleDateMatch = line.match(SINGLE_DATE_PATTERN);
    const amountMatch = line.match(AMOUNT_PATTERN);

    if (singleDateMatch && amountMatch) {
      // Save previous transaction
      if (state.currentTransaction && isValidTransaction(state.currentTransaction)) {
        transactions.push(state.currentTransaction as ParsedTransaction);
      }

      try {
        state.currentTransaction = parseSingleDateLine(line, lineNumber, warnings);
        state.inTransaction = false;  // Single-line transactions

        if (isValidTransaction(state.currentTransaction)) {
          transactions.push(state.currentTransaction as ParsedTransaction);
          state.currentTransaction = null;
        }
      } catch (e) {
        warnings.push({
          line: lineNumber,
          message: e instanceof Error ? e.message : 'Parse error',
          raw: line
        });
      }
      continue;
    }

    // Continue multi-line transaction
    if (state.inTransaction && state.currentTransaction) {
      parseAdditionalLine(line, state.currentTransaction);
    }
  }

  // Don't forget the last transaction
  if (state.currentTransaction && isValidTransaction(state.currentTransaction)) {
    transactions.push(state.currentTransaction as ParsedTransaction);
  }

  return {
    transactions,
    warnings,
    metadata: {
      bank: 'dkb',
      pages_parsed: 1,
      raw_lines: lines.length
    }
  };
}

function shouldSkipLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return true;
  return SKIP_PATTERNS.some(pattern => trimmed.includes(pattern));
}

function parseTwoDateLine(
  line: string,
  lineNumber: number,
  warnings: ParseWarning[]
): Partial<ParsedTransaction> {
  const dateMatch = line.match(DATE_PATTERN);
  const amountMatch = line.match(AMOUNT_PATTERN);

  if (!dateMatch) {
    throw new Error('No dates found');
  }

  // Use booking date (second date) as transaction date
  const bookingDate = parseGermanDate(dateMatch[2]);
  const dateStr = formatISODate(bookingDate);

  // Extract vendor (between dates and amount)
  let vendorPart = line.substring(dateMatch[0].length);
  if (amountMatch) {
    vendorPart = vendorPart.substring(0, vendorPart.length - amountMatch[0].length).trim();
  }

  // Parse vendor and location
  const { vendor, location } = extractDKBVendor(vendorPart);

  // Parse amount
  let amount = 0;
  let direction: 'debit' | 'credit' = 'debit';

  if (amountMatch) {
    const isCredit = amountMatch[2] === '+';
    amount = parseGermanAmount(amountMatch[1]);
    direction = isCredit ? 'credit' : 'debit';
  } else {
    warnings.push({
      line: lineNumber,
      message: 'No amount found',
      raw: line
    });
  }

  return {
    date: dateStr,
    amount,
    direction,
    raw_vendor: vendorPart,
    description: location || '',
    metadata: {
      receipt_date: formatISODate(parseGermanDate(dateMatch[1]))
    }
  };
}

function parseSingleDateLine(
  line: string,
  lineNumber: number,
  warnings: ParseWarning[]
): Partial<ParsedTransaction> {
  const dateMatch = line.match(SINGLE_DATE_PATTERN);
  const amountMatch = line.match(AMOUNT_PATTERN);

  if (!dateMatch || !amountMatch) {
    throw new Error('Invalid single date line');
  }

  const date = parseGermanDate(dateMatch[1]);

  // Extract description between date and amount
  let description = line.substring(dateMatch[0].length);
  description = description.substring(0, description.length - amountMatch[0].length).trim();

  const isCredit = amountMatch[2] === '+';
  const amount = parseGermanAmount(amountMatch[1]);

  // "Lastschrift" with + is a credit card payment (transfer)
  const isTransfer = description.includes('Lastschrift') && isCredit;

  return {
    date: formatISODate(date),
    amount,
    direction: isCredit ? 'credit' : 'debit',
    raw_vendor: description,
    description: isTransfer ? 'Credit card payment' : description,
    metadata: isTransfer ? { is_transfer: 'true' } : {}
  };
}

function extractDKBVendor(text: string): { vendor: string; location?: string } {
  const trimmed = text.trim();

  // PayPal special handling
  if (trimmed.startsWith('PAYPAL')) {
    const match = trimmed.match(/PAYPAL \*([^,]+)/);
    return { vendor: 'PayPal', location: match?.[1] };
  }

  // Amazon special handling
  if (trimmed.includes('AMZN') || trimmed.includes('AMAZON')) {
    return { vendor: 'Amazon' };
  }

  // Standard: "VENDOR, LOCATION"
  const parts = trimmed.split(',');
  return {
    vendor: parts[0]?.trim() || trimmed,
    location: parts[1]?.trim()
  };
}

function parseAdditionalLine(
  line: string,
  transaction: Partial<ParsedTransaction>
): void {
  const trimmed = line.trim();

  // Skip bonus miles line
  if (trimmed.includes('Prämienmeilen')) {
    return;
  }

  // Append to description
  if (transaction.description) {
    transaction.description += ' ' + trimmed;
  } else {
    transaction.description = trimmed;
  }
}

function isValidTransaction(tx: Partial<ParsedTransaction>): boolean {
  return !!(
    tx.date &&
    tx.amount !== undefined &&
    tx.direction &&
    tx.raw_vendor
  );
}
