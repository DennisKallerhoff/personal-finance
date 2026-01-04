import { parseGermanAmount } from '../german-numbers.ts';
import { parseGermanDate, formatISODate } from '../german-dates.ts';
import type { ParsedTransaction, ParseResult, ParseWarning } from './types.ts';

// Pattern to match DKB transactions in continuous text (no line breaks)
// Format: DD.MM.YY DD.MM.YY VENDOR 123,45 - [Prämienmeilen +XX]
const TRANSACTION_PATTERN = /(\d{2}\.\d{2}\.\d{2})\s+(\d{2}\.\d{2}\.\d{2})\s+(.+?)\s+([\d.]+,\d{2})\s*([-+])/g;

// Single date transactions (like "Saldo letzte Abrechnung" or "monatlicher Kartenpreis")
const SINGLE_DATE_PATTERN = /(\d{2}\.\d{2}\.\d{2})\s+(Saldo letzte Abrechnung|Lastschrift|monatlicher Kartenpreis|Neuer Saldo)\s+([\d.]+,\d{2})\s*([-+])/g;

// Skip these - they're not real transactions
const SKIP_VENDORS = [
  'Saldo letzte Abrechnung',
  'Neuer Saldo',
  'Übertrag von Seite',
  'Zwischensumme von Seite',
];

export function parseDKB(text: string): ParseResult {
  const transactions: ParsedTransaction[] = [];
  const warnings: ParseWarning[] = [];

  // Find all two-date transactions (the main transaction pattern)
  let match;
  while ((match = TRANSACTION_PATTERN.exec(text)) !== null) {
    const [fullMatch, receiptDate, bookingDate, vendorRaw, amountStr, sign] = match;

    // Clean up vendor - remove trailing Prämienmeilen if present
    let vendor = vendorRaw.trim();

    // Skip non-transaction entries
    if (SKIP_VENDORS.some(skip => vendor.includes(skip))) {
      continue;
    }

    // Skip if vendor looks like page header content
    if (vendor.includes('Kontaktdaten') || vendor.includes('Abrechnungsnummer')) {
      continue;
    }

    try {
      const bookingDateParsed = parseGermanDate(bookingDate);
      const receiptDateParsed = parseGermanDate(receiptDate);

      const amount = parseGermanAmount(amountStr);
      const isCredit = sign === '+';

      // For credit cards: - means expense (debit), + means refund/payment (credit)
      const direction: 'debit' | 'credit' = isCredit ? 'credit' : 'debit';

      // Check if this is a Lastschrift (credit card payment - internal transfer)
      const isTransfer = vendor === 'Lastschrift' && isCredit;

      // Extract vendor and location
      const { vendorName, location } = extractVendorAndLocation(vendor);

      transactions.push({
        date: formatISODate(bookingDateParsed),
        amount,
        direction,
        raw_vendor: vendor,
        description: location || '',
        metadata: {
          receipt_date: formatISODate(receiptDateParsed),
          ...(isTransfer ? { is_transfer: 'true' } : {})
        }
      });
    } catch (e) {
      warnings.push({
        line: 0,
        message: e instanceof Error ? e.message : 'Parse error',
        raw: fullMatch
      });
    }
  }

  // Also find single-date transactions (Lastschrift payments, fees)
  SINGLE_DATE_PATTERN.lastIndex = 0; // Reset regex
  while ((match = SINGLE_DATE_PATTERN.exec(text)) !== null) {
    const [fullMatch, date, type, amountStr, sign] = match;

    // Skip balance entries
    if (type === 'Saldo letzte Abrechnung' || type === 'Neuer Saldo') {
      continue;
    }

    try {
      const dateParsed = parseGermanDate(date);
      const amount = parseGermanAmount(amountStr);
      const isCredit = sign === '+';
      const direction: 'debit' | 'credit' = isCredit ? 'credit' : 'debit';

      // Lastschrift with + is credit card payment (transfer to pay off balance)
      const isTransfer = type === 'Lastschrift' && isCredit;

      // Skip Lastschrift - it's already captured by two-date pattern
      if (type === 'Lastschrift') {
        continue;
      }

      transactions.push({
        date: formatISODate(dateParsed),
        amount,
        direction,
        raw_vendor: type,
        description: type === 'monatlicher Kartenpreis' ? 'Monthly card fee' : type,
        metadata: isTransfer ? { is_transfer: 'true' } : {}
      });
    } catch (e) {
      warnings.push({
        line: 0,
        message: e instanceof Error ? e.message : 'Parse error',
        raw: fullMatch
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
      pages_parsed: 1,
      raw_lines: 1 // No line breaks in unpdf output
    }
  };
}

function extractVendorAndLocation(text: string): { vendorName: string; location?: string } {
  const trimmed = text.trim();

  // PayPal special handling: "PAYPAL *aichu240600, 35314369001"
  if (trimmed.startsWith('PAYPAL')) {
    const match = trimmed.match(/PAYPAL \*([^,]+)/);
    return { vendorName: 'PayPal', location: match?.[1] };
  }

  // Amazon special handling: "AMZN Mktp DE*DD3403EV5, 800-279-6620"
  if (trimmed.includes('AMZN') || trimmed.includes('AMAZON')) {
    return { vendorName: 'Amazon' };
  }

  // Standard format: "VENDOR, LOCATION"
  const commaIndex = trimmed.lastIndexOf(',');
  if (commaIndex > 0) {
    return {
      vendorName: trimmed.substring(0, commaIndex).trim(),
      location: trimmed.substring(commaIndex + 1).trim()
    };
  }

  return { vendorName: trimmed };
}
