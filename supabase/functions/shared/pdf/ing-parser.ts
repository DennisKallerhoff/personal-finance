import { parseGermanAmount } from '../german-numbers.ts';
import { parseGermanDate, formatISODate } from '../german-dates.ts';
import type { ParsedTransaction, ParseResult, ParseWarning } from './types.ts';

const TRANSACTION_TYPES = [
  'Lastschrift',
  'Gutschrift',
  'Gutschrift/Dauerauftrag',
  'Dauerauftrag/Terminueberw.',
  'Ueberweisung',
  'Abschluss'
] as const;

// Regex to detect transaction start: DD.MM.YYYY at line start
const DATE_PATTERN = /^(\d{2}\.\d{2}\.\d{4})\s+/;

// Regex to extract amount at line end: [-]X.XXX,XX
const AMOUNT_PATTERN = /(-?\d{1,3}(?:\.\d{3})*,\d{2})\s*$/;

interface ParserState {
  inTransaction: boolean;
  currentTransaction: Partial<ParsedTransaction> | null;
  lines: string[];
}

export function parseING(text: string): ParseResult {
  const lines = text.split('\n');
  const transactions: ParsedTransaction[] = [];
  const warnings: ParseWarning[] = [];

  let state: ParserState = {
    inTransaction: false,
    currentTransaction: null,
    lines: []
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const lineNumber = i + 1;

    // Skip empty lines and known non-transaction lines
    if (!line || shouldSkipLine(line)) {
      continue;
    }

    // Check if this is a new transaction start (must have both date and amount)
    const dateMatch = line.match(DATE_PATTERN);
    const amountMatch = line.match(AMOUNT_PATTERN);

    if (dateMatch && amountMatch) {
      // Save previous transaction if exists
      if (state.currentTransaction && isValidTransaction(state.currentTransaction)) {
        transactions.push(state.currentTransaction as ParsedTransaction);
      }

      // Start new transaction
      try {
        state.currentTransaction = parseTransactionLine(line, lineNumber, warnings);
        state.inTransaction = true;
        state.lines = [line];
      } catch (e) {
        warnings.push({
          line: lineNumber,
          message: e instanceof Error ? e.message : 'Parse error',
          raw: line
        });
        state.inTransaction = false;
        state.currentTransaction = null;
      }
    } else if (state.inTransaction && state.currentTransaction) {
      // Continue collecting multi-line transaction
      state.lines.push(line);
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
      bank: 'ing',
      pages_parsed: 1,
      raw_lines: lines.length
    }
  };
}

function shouldSkipLine(line: string): boolean {
  const skipPatterns = [
    'Neuer Saldo',
    'Abschluss für Konto',
    'Kunden-Information',
    'Girokonto Nummer',
    'Kontoauszug',
    'Buchung  Buchung',
    'Valuta'
  ];
  return skipPatterns.some(pattern => line.includes(pattern));
}

function parseTransactionLine(
  line: string,
  lineNumber: number,
  warnings: ParseWarning[]
): Partial<ParsedTransaction> {
  const dateMatch = line.match(DATE_PATTERN);
  const amountMatch = line.match(AMOUNT_PATTERN);

  if (!dateMatch) {
    throw new Error('No date found');
  }

  const date = parseGermanDate(dateMatch[1]);
  const dateStr = formatISODate(date);

  // Extract the middle part (between date and amount)
  let middlePart = line.substring(dateMatch[0].length);
  if (amountMatch) {
    middlePart = middlePart.substring(0, middlePart.length - amountMatch[0].length).trim();
  }

  // Detect transaction type
  let type: string | undefined;
  let vendor = middlePart;

  for (const txType of TRANSACTION_TYPES) {
    if (middlePart.includes(txType)) {
      type = txType;
      vendor = middlePart.split(txType)[1]?.trim() || middlePart;
      break;
    }
  }

  // Parse amount
  let amount = 0;
  let direction: 'debit' | 'credit' = 'debit';

  if (amountMatch) {
    amount = parseGermanAmount(amountMatch[1]);
    direction = amount < 0 ? 'debit' : 'credit';
    amount = Math.abs(amount);
  } else {
    warnings.push({
      line: lineNumber,
      message: 'No amount found on transaction line',
      raw: line
    });
  }

  return {
    date: dateStr,
    amount,
    direction,
    raw_vendor: vendor,
    description: '',
    type,
    metadata: {}
  };
}

function parseAdditionalLine(
  line: string,
  transaction: Partial<ParsedTransaction>
): void {
  // Check for metadata fields
  if (line.startsWith('Mandat:')) {
    transaction.metadata = transaction.metadata || {};
    transaction.metadata.mandat = line.replace('Mandat:', '').trim();
    return;
  }

  if (line.startsWith('Referenz:')) {
    transaction.metadata = transaction.metadata || {};
    transaction.metadata.referenz = line.replace('Referenz:', '').trim();
    return;
  }

  // Otherwise, append to description
  if (transaction.description) {
    transaction.description += ' ' + line;
  } else {
    transaction.description = line;
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
