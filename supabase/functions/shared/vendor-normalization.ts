/**
 * Vendor normalization utilities for consistent rule matching
 *
 * Normalizes vendor names from bank statements to improve categorization:
 * - Strips payment processor prefixes (PayPal, Square, etc.)
 * - Removes location suffixes
 * - Applies known vendor aliases
 * - Cleans special characters
 */

// Payment processor prefixes to strip
const PAYMENT_PROCESSORS = [
  /^PAYPAL \*/i,
  /^SQ \*/i,           // Square
  /^CKO\*/i,           // Checkout.com
  /^STRIPE \*/i,
];

// Vendor aliases (normalize to canonical name)
const VENDOR_ALIASES: Record<string, string> = {
  'AMZN': 'AMAZON',
  'AMZN MKTP': 'AMAZON',
  'AMAZON EU': 'AMAZON',
  'AMAZON PRIME': 'AMAZON',
  'MC DONALDS': 'MCDONALDS',
  "MCDONALD'S": 'MCDONALDS',
  'DB VERTRIEB': 'DEUTSCHE BAHN',
  'DB BAHN': 'DEUTSCHE BAHN',
  'REWE': 'REWE',
  'EDEKA': 'EDEKA',
  'LIDL': 'LIDL',
  'ALDI': 'ALDI',
};

/**
 * Normalize vendor names for consistent rule matching
 *
 * Examples:
 *   "PAYPAL *SPOTIFY" → "SPOTIFY"
 *   "EDEKA MARTENS, HAMBURG" → "EDEKA MARTENS"
 *   "AMZN Mktp DE*AB12CD" → "AMAZON"
 *   "Mc Donald's" → "MCDONALDS"
 */
export function normalizeVendor(rawVendor: string): string {
  if (!rawVendor || rawVendor.trim().length === 0) {
    return '';
  }

  let vendor = rawVendor.trim();

  // 1. Strip payment processor prefixes
  for (const pattern of PAYMENT_PROCESSORS) {
    if (pattern.test(vendor)) {
      vendor = vendor.replace(pattern, '').trim();
      break;
    }
  }

  // 2. Remove location suffix (after comma)
  const commaIndex = vendor.indexOf(',');
  if (commaIndex > 0) {
    vendor = vendor.substring(0, commaIndex).trim();
  }

  // 3. Uppercase for consistent matching
  vendor = vendor.toUpperCase();

  // 4. Apply known aliases
  for (const [pattern, canonical] of Object.entries(VENDOR_ALIASES)) {
    if (vendor.includes(pattern)) {
      vendor = canonical;
      break;
    }
  }

  // 5. Clean special characters
  vendor = vendor
    .replace(/['']/g, '')           // Smart quotes
    .replace(/\s+/g, ' ')           // Multiple spaces
    .replace(/[*#]+$/, '')          // Trailing special chars
    .trim();

  return vendor;
}

/**
 * Extract sub-vendor from PayPal transactions
 * "PAYPAL *SPOTIFY AB123" → "SPOTIFY"
 */
export function extractPayPalSubVendor(rawVendor: string): string | null {
  const match = rawVendor.match(/PAYPAL \*([A-Z0-9]+)/i);
  return match ? match[1].toUpperCase() : null;
}
