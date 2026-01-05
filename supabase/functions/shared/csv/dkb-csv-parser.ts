import { parseGermanAmount } from '../german-numbers.ts';
import type { ParsedTransaction, ParseResult, ParseWarning } from '../pdf/types.ts';

// CSV columns (0-indexed):
// 0: Getätigt am (receipt date)
// 1: Ausgeführt am (execution date, may be empty for pending)
// 2: Betrag (amount with negative prefix)
// 3: Waehrung (currency)
// 4: Verwendungszweck (vendor/purpose)
// 5: Zahlungsart (payment type)
// 6: Status (Vorgemerkt/Gebucht/Abgelehnt)
// 7: Betrag in Fremdwährung (foreign amount, optional)
// 8: Waehrung (foreign currency, optional)
// 9: Wechselkurs (exchange rate, optional)

interface CSVRow {
  receiptDate: string;
  executionDate: string;
  amount: string;
  currency: string;
  vendor: string;
  paymentType: string;
  status: string;
  foreignAmount?: string;
  foreignCurrency?: string;
  exchangeRate?: string;
}

export function parseDKBCSV(text: string): ParseResult {
  const transactions: ParsedTransaction[] = [];
  const warnings: ParseWarning[] = [];

  // Split into lines
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  if (lines.length < 3) {
    throw new Error('CSV file is too short (needs header + column headers + data)');
  }

  // Line 0: Card header (e.g., "Miles & More Gold Credit Card;5310XXXXXXXX5214")
  const headerLine = lines[0];
  const cardMatch = headerLine.match(/Miles & More.*?;(\d{4}X+\d{4})/);
  const accountNumber = cardMatch ? cardMatch[1] : undefined;

  // Line 1: Empty line (usually)
  // Line 2: Column headers
  // Lines 3+: Data rows

  let dataStartIndex = 3;
  // Find where data starts (skip header and column header)
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].startsWith('Getätigt am')) {
      dataStartIndex = i + 1;
      break;
    }
  }

  // Parse each data row
  for (let i = dataStartIndex; i < lines.length; i++) {
    const line = lines[i];

    try {
      const row = parseCSVRow(line);

      // Skip rejected transactions
      if (row.status === 'Abgelehnt') {
        continue;
      }

      // Parse dates (DD.MM.YYYY format)
      const receiptDate = parseGermanDateCSV(row.receiptDate);

      // Execution date may be empty for pending transactions
      const executionDate = row.executionDate
        ? parseGermanDateCSV(row.executionDate)
        : receiptDate;

      // Parse amount (negative prefix: "-9,99")
      const amountCents = parseGermanAmount(row.amount);
      const isNegative = row.amount.trim().startsWith('-');

      // For credit cards: negative = expense (debit), positive = refund/payment (credit)
      const direction: 'debit' | 'credit' = isNegative ? 'debit' : 'credit';

      // Detect transfers: Lastschrift (direct debit) with positive amount = CC payment
      const isTransfer = row.vendor === 'Lastschrift' && !isNegative;

      // Extract vendor and location
      const { vendorName, location } = extractVendorAndLocation(row.vendor);

      // Build metadata
      const metadata: Record<string, any> = {
        status: row.status,
        payment_type: row.paymentType,
        receipt_date: receiptDate,
      };

      if (row.executionDate) {
        metadata.execution_date = executionDate;
      }

      if (row.foreignAmount && row.foreignCurrency) {
        metadata.foreign_amount = parseFloat(row.foreignAmount.replace(',', '.'));
        metadata.foreign_currency = row.foreignCurrency;
      }

      if (row.exchangeRate) {
        metadata.exchange_rate = parseFloat(row.exchangeRate.replace(',', '.'));
      }

      if (isTransfer) {
        metadata.is_transfer = 'true';
      }

      transactions.push({
        date: executionDate, // Use execution date as primary (or receipt if empty)
        amount: Math.abs(amountCents), // Always positive
        direction,
        raw_vendor: row.vendor,
        description: location || '',
        metadata
      });

    } catch (e) {
      warnings.push({
        line: i,
        message: e instanceof Error ? e.message : 'Parse error',
        raw: line
      });
    }
  }

  // Sort by date
  transactions.sort((a, b) => a.date.localeCompare(b.date));

  return {
    transactions,
    warnings,
    metadata: {
      bank: 'dkb',
      format: 'csv',
      account_number: accountNumber,
      rows_parsed: transactions.length
    }
  };
}

function parseCSVRow(line: string): CSVRow {
  // Split by semicolon
  const parts = line.split(';');

  if (parts.length < 7) {
    throw new Error(`Invalid CSV row: expected at least 7 columns, got ${parts.length}`);
  }

  return {
    receiptDate: parts[0]?.trim() || '',
    executionDate: parts[1]?.trim() || '',
    amount: parts[2]?.trim() || '',
    currency: parts[3]?.trim() || '',
    vendor: parts[4]?.trim() || '',
    paymentType: parts[5]?.trim() || '',
    status: parts[6]?.trim() || '',
    foreignAmount: parts[7]?.trim() || undefined,
    foreignCurrency: parts[8]?.trim() || undefined,
    exchangeRate: parts[9]?.trim() || undefined,
  };
}

function parseGermanDateCSV(dateStr: string): string {
  // Parse DD.MM.YYYY format
  if (!dateStr || dateStr.length === 0) {
    throw new Error('Empty date');
  }

  const parts = dateStr.split('.');
  if (parts.length !== 3) {
    throw new Error(`Invalid date format: ${dateStr}`);
  }

  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const year = parseInt(parts[2], 10);

  if (isNaN(day) || isNaN(month) || isNaN(year)) {
    throw new Error(`Invalid date values: ${dateStr}`);
  }

  // Validate ranges
  if (month < 1 || month > 12) {
    throw new Error(`Invalid month: ${month}`);
  }
  if (day < 1 || day > 31) {
    throw new Error(`Invalid day: ${day}`);
  }

  // Return ISO format (YYYY-MM-DD)
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function extractVendorAndLocation(text: string): { vendorName: string; location?: string } {
  const trimmed = text.trim();

  // PayPal special handling: "PAYPAL *aichu240600" or "PAYPAL *flo.lemm"
  if (trimmed.startsWith('PAYPAL')) {
    const match = trimmed.match(/PAYPAL \*([^,]+)/);
    return { vendorName: 'PayPal', location: match?.[1] };
  }

  // Amazon special handling: "AMZN Mktp DE" or "AMZN Mktp ES*ZG40F0ZM4"
  if (trimmed.includes('AMZN') || trimmed.includes('AMAZON')) {
    return { vendorName: 'Amazon' };
  }

  // Standard format: "VENDOR, LOCATION" (rare in CSV, but handle it)
  const commaIndex = trimmed.lastIndexOf(',');
  if (commaIndex > 0) {
    return {
      vendorName: trimmed.substring(0, commaIndex).trim(),
      location: trimmed.substring(commaIndex + 1).trim()
    };
  }

  return { vendorName: trimmed };
}
