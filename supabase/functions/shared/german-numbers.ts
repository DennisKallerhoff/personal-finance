/**
 * Parse German-formatted amount to cents
 * Handles: "1.234,56", "-1.234,56", "1.234,56 -", "1.234,56 +"
 */
export function parseGermanAmount(str: string): number {
  let negative = false;
  if (str.startsWith('-') || str.trim().endsWith('-')) {
    negative = true;
  }
  if (str.trim().endsWith('+')) {
    negative = false;
  }

  const cleaned = str.replace(/[^0-9,]/g, '');
  const parts = cleaned.split(',');
  const euros = parseInt(parts[0] || '0');
  const cents = parseInt((parts[1] || '0').padEnd(2, '0').slice(0, 2));

  const total = euros * 100 + cents;
  return negative ? -total : total;
}

/**
 * Format cents to German display
 * 123456 → "1.234,56 €"
 */
export function formatGermanAmount(cents: number): string {
  const negative = cents < 0;
  const abs = Math.abs(cents);
  const euros = Math.floor(abs / 100);
  const centsPart = abs % 100;

  const formatted = euros.toLocaleString('de-DE') + ',' +
                    centsPart.toString().padStart(2, '0');

  return (negative ? '-' : '') + formatted + ' €';
}
