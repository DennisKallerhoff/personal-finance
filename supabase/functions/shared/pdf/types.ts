export type TransactionDirection = 'debit' | 'credit';

export interface ParsedTransaction {
  date: string;              // ISO format: YYYY-MM-DD
  amount: number;            // In cents, always positive
  direction: TransactionDirection;
  raw_vendor: string;        // Original text from PDF
  description: string;       // Additional details
  type?: string;             // Transaction type (Lastschrift, etc.)
  metadata?: Record<string, string>;  // Mandat, Referenz, etc.
}

export interface ParseWarning {
  line: number;
  message: string;
  raw: string;
}

export interface ParseResult {
  transactions: ParsedTransaction[];
  warnings: ParseWarning[];
  metadata: {
    bank: 'ing' | 'dkb';
    account_number?: string;
    statement_period?: string;
    pages_parsed: number;
    raw_lines: number;
  };
}
