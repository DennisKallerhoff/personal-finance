/**
 * Parse German date format to Date
 * Handles: "01.12.2017" (ING) and "28.12.23" (DKB)
 */
export function parseGermanDate(str: string): Date {
  const parts = str.trim().split('.');
  if (parts.length !== 3) {
    throw new Error(`Invalid date format: ${str}`);
  }

  const day = parseInt(parts[0]);
  const month = parseInt(parts[1]) - 1;
  let year = parseInt(parts[2]);

  // Handle 2-digit years (DKB format)
  if (year < 100) {
    year = year < 50 ? 2000 + year : 1900 + year;
  }

  const date = new Date(year, month, day);

  // Validate the date is real
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${str}`);
  }

  return date;
}

/**
 * Format Date to ISO string (YYYY-MM-DD)
 */
export function formatISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
