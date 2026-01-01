# PDF Parsing Rules

Patterns for extracting transactions from bank PDFs.

---

## Supported Formats

| Bank | Document Type | Parser |
|------|---------------|--------|
| ING DiBa | Girokonto Kontoauszug | `ing-parser.ts` |
| DKB | Miles & More Credit Card Abrechnung | `dkb-parser.ts` |

---

## ING Girokonto Parser

### Document Structure

```
Girokonto Nummer XXXXXXXXXX
Kontoauszug [Month] [Year]

Buchung  Buchung / Verwendungszweck                    Betrag (EUR)
Valuta

DD.MM.YYYY  [Type] [Vendor/Description]                    [-]X.XXX,XX
DD.MM.YYYY  [Detail line 1]
            [Detail line 2]
            Mandat: XXXXX
            Referenz: XXXXX
```

### Transaction Types

| German | Meaning | Direction |
|--------|---------|-----------|
| `Lastschrift` | Direct debit | Expense |
| `Gutschrift` | Credit/incoming | Income |
| `Gutschrift/Dauerauftrag` | Standing order credit | Income |
| `Dauerauftrag/Terminueberw.` | Standing order/scheduled | Expense |
| `Ueberweisung` | Transfer out | Expense |
| `Abschluss` | Account closing/fees | Expense |

### Parsing Rules

**Date Format:** `DD.MM.YYYY`
```typescript
// Parse: "01.12.2017" → Date
const parseINGDate = (str: string): Date => {
  const [day, month, year] = str.split('.')
  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
}
```

**Amount Format:** German with sign prefix
```typescript
// "-1.234,56" → -123456 cents
// "1.234,56" → 123456 cents
const parseINGAmount = (str: string): number => {
  const negative = str.startsWith('-')
  const cleaned = str.replace(/[^0-9,]/g, '').replace(',', '')
  const cents = parseInt(cleaned)
  return negative ? -cents : cents
}
```

**Transaction Block Detection:**
```typescript
// Line starts with DD.MM.YYYY pattern
const isTransactionStart = (line: string): boolean => {
  return /^\d{2}\.\d{2}\.\d{4}\s+/.test(line)
}
```

**Vendor Extraction:**
```typescript
// First line after type contains vendor
// "Lastschrift ALTE LEIPZIGER BAUSPAR AG" → "ALTE LEIPZIGER BAUSPAR AG"
const extractVendor = (line: string): string => {
  const types = ['Lastschrift', 'Gutschrift', 'Gutschrift/Dauerauftrag',
                 'Dauerauftrag/Terminueberw.', 'Ueberweisung', 'Abschluss']
  for (const type of types) {
    if (line.includes(type)) {
      return line.split(type)[1]?.trim() || ''
    }
  }
  return line.trim()
}
```

### Skip Rules

Skip these lines (not transactions):
- Lines containing only `Neuer Saldo`
- Lines starting with `Abschluss für Konto`
- Lines in the footer (after `Kunden-Information`)
- Header lines (before first transaction)

### Sample Transaction Block

```
01.12.2017 Lastschrift ALTE LEIPZIGER BAUSPAR AG              -484,55
01.12.2017 00006919254 DEZEMBER 2017VERTRAG: 0 248651201
           Mandat: 000000019455825
           Referenz: 0000069192540
```

**Extracted:**
```typescript
{
  date: "2017-12-01",
  type: "Lastschrift",
  raw_vendor: "ALTE LEIPZIGER BAUSPAR AG",
  description: "00006919254 DEZEMBER 2017VERTRAG: 0 248651201",
  amount: -48455,  // cents
  direction: "debit",
  metadata: {
    mandat: "000000019455825",
    referenz: "0000069192540"
  }
}
```

---

## DKB Miles & More Credit Card Parser

### Document Structure

```
Ihre Abrechnung vom DD.MM.YYYY bis DD.MM.YYYY

Datum    Datum     Angabe des Unternehmens /     Währung  Betrag  Kurs  Betrag in
Beleg    Buchung   Verwendungszweck                                     EUR

         DD.MM.YY  Saldo letzte Abrechnung                              X.XXX,XX -
DD.MM.YY DD.MM.YY  Lastschrift                                          X.XXX,XX +
DD.MM.YY DD.MM.YY  [Vendor], [Location]                                 XX,XX -
                   Prämienmeilen              +XX
```

### Special Entries

| Entry | Meaning | Action |
|-------|---------|--------|
| `Saldo letzte Abrechnung` | Previous balance | Skip (not a transaction) |
| `Lastschrift` (with `+`) | Payment received | Mark as transfer (CC payment) |
| `Neuer Saldo` | New balance | Skip |
| `monatlicher Kartenpreis` | Monthly fee | Include as expense |
| `Prämienmeilen` | Bonus miles line | Skip |
| `Übertrag von Seite X` | Page continuation | Skip |
| `Zwischensumme von Seite X` | Page subtotal | Skip |

### Parsing Rules

**Date Format:** `DD.MM.YY`
```typescript
// Parse: "28.12.23" → Date (assumes 20XX for YY < 50)
const parseDKBDate = (str: string): Date => {
  const [day, month, year] = str.split('.')
  const fullYear = parseInt(year) < 50 ? 2000 + parseInt(year) : 1900 + parseInt(year)
  return new Date(fullYear, parseInt(month) - 1, parseInt(day))
}
```

**Amount Format:** German with +/- suffix
```typescript
// "1.234,56 -" → -123456 cents (expense)
// "1.234,56 +" → 123456 cents (income/payment)
const parseDKBAmount = (str: string): number => {
  const isCredit = str.trim().endsWith('+')
  const cleaned = str.replace(/[^0-9,]/g, '').replace(',', '')
  const cents = parseInt(cleaned)
  return isCredit ? cents : -cents
}
```

**Transaction Line Detection:**
```typescript
// Has two dates at start, or one date + amount at end
const isTransactionLine = (line: string): boolean => {
  // Two dates pattern: "DD.MM.YY DD.MM.YY"
  const twoDates = /^\d{2}\.\d{2}\.\d{2}\s+\d{2}\.\d{2}\.\d{2}/.test(line)
  // Single date with amount: starts with spaces, has date, ends with amount
  const singleDate = /^\s+\d{2}\.\d{2}\.\d{2}/.test(line) && /[\d,]+\s*[-+]$/.test(line)
  return twoDates || singleDate
}
```

**Vendor Extraction:**
```typescript
// "JIM BLOCK, HAMBURG" → vendor: "JIM BLOCK", location: "HAMBURG"
// "PAYPAL *aichu240600, 35314369001" → vendor: "PAYPAL", description: "aichu240600"
const extractDKBVendor = (text: string): { vendor: string, location?: string } => {
  // PayPal special handling
  if (text.startsWith('PAYPAL')) {
    const match = text.match(/PAYPAL \*([^,]+)/)
    return { vendor: 'PayPal', location: match?.[1] }
  }

  // Amazon special handling
  if (text.includes('AMZN')) {
    return { vendor: 'Amazon' }
  }

  // Standard: "VENDOR, LOCATION"
  const parts = text.split(',')
  return {
    vendor: parts[0]?.trim(),
    location: parts[1]?.trim()
  }
}
```

### Skip Rules

Skip lines containing:
- `Prämienmeilen` (bonus miles)
- `Übertrag von Seite`
- `Zwischensumme von Seite`
- `Saldo letzte Abrechnung`
- `Neuer Saldo`

### Multi-line Transactions

Some transactions span multiple lines (e.g., flights):

```
24.01.24 24.01.24 EUROWINGSSJYT9D_277471,                            1.039,94 -
                  DUSSELDORF
                  Passagier: KALLERHOFF/KATHARINA FRIE
                  Ticket-Nummer: SJYT9D_277471
                  Verkaufsstelle: Eurowings GmbH
                  Abflugdatum: 240701
                  Abflugort: HAM
                  Destination: SZG
                  Prämienmeilen              +519
```

**Rule:** Continue collecting lines until next transaction start or `Prämienmeilen`.

### Sample Transaction

```
29.12.23 02.01.24 EDEKA MARTENS, Ammersbek                           42,05 -
                  Prämienmeilen              +21
```

**Extracted:**
```typescript
{
  date_receipt: "2023-12-29",
  date_booking: "2024-01-02",
  raw_vendor: "EDEKA MARTENS, Ammersbek",
  normalized_vendor: "Edeka",
  location: "Ammersbek",
  amount: -4205,  // cents
  direction: "debit"
}
```

---

## Common German Number Handling

### Amount Parsing (Both Banks)

```typescript
/**
 * Parse German-formatted amount to cents
 * "1.234,56" → 123456
 * "-1.234,56" → -123456
 * "1.234,56 -" → -123456
 * "1.234,56 +" → 123456
 */
export function parseGermanAmount(str: string): number {
  // Detect sign
  let negative = false
  if (str.startsWith('-') || str.trim().endsWith('-')) {
    negative = true
  }
  if (str.trim().endsWith('+')) {
    negative = false
  }

  // Remove all non-numeric except comma
  const cleaned = str.replace(/[^0-9,]/g, '')

  // Split on comma (decimal separator)
  const parts = cleaned.split(',')
  const euros = parseInt(parts[0] || '0')
  const cents = parseInt((parts[1] || '0').padEnd(2, '0').slice(0, 2))

  const total = euros * 100 + cents
  return negative ? -total : total
}
```

### Amount Display

```typescript
/**
 * Format cents to German display
 * 123456 → "1.234,56 €"
 * -123456 → "-1.234,56 €"
 */
export function formatGermanAmount(cents: number): string {
  const negative = cents < 0
  const abs = Math.abs(cents)
  const euros = Math.floor(abs / 100)
  const centsPart = abs % 100

  const formatted = euros.toLocaleString('de-DE') + ',' +
                    centsPart.toString().padStart(2, '0')

  return (negative ? '-' : '') + formatted + ' €'
}
```

---

## Transfer Detection

### ING → DKB Credit Card Payment

**In ING statement:**
```
Lastschrift [YOUR NAME or "Kallerhoff"]
ING-DIBA AG [account number] [date] ZINSEN [X] TILGUNG [Y]
```

**In DKB statement:**
```
Lastschrift                                              X.XXX,XX +
```

**Detection rules:**
1. DKB: Entry with `Lastschrift` and `+` suffix = incoming payment
2. ING: Entry with `ING-DIBA AG` and loan account number = mortgage payment (different)
3. Match: Same amount (±1 cent), within 3 days

### Internal Transfers

Keywords indicating internal transfer:
- `Übertrag`
- `Umbuchung`
- `Kreditkarte`
- Own name appearing as vendor

---

## Error Handling

### Graceful Degradation

```typescript
interface ParseResult {
  transactions: Transaction[]
  warnings: ParseWarning[]
  errors: ParseError[]
}

interface ParseWarning {
  line: number
  message: string
  raw: string
}

// Partial success is OK
// Log warning, continue parsing
if (!canParseAmount(line)) {
  warnings.push({
    line: lineNumber,
    message: 'Could not parse amount',
    raw: line
  })
  continue  // Skip this transaction
}
```

### Validation

After parsing, validate:
```typescript
function validateTransaction(t: Transaction): string[] {
  const errors: string[] = []

  if (!t.date || isNaN(t.date.getTime())) {
    errors.push('Invalid date')
  }
  if (t.amount === 0) {
    errors.push('Zero amount')
  }
  if (!t.raw_vendor || t.raw_vendor.length < 2) {
    errors.push('Missing vendor')
  }

  return errors
}
```

---

## Testing

### Snapshot Tests

Store expected output for known inputs:

```typescript
// tests/parsers/ing.test.ts
import { parseING } from '../src/parsers/ing'
import ingFixture from './fixtures/ing-2017-12.txt'
import ingExpected from './fixtures/ing-2017-12.expected.json'

test('ING December 2017 statement', () => {
  const result = parseING(ingFixture)
  expect(result.transactions).toMatchObject(ingExpected)
})
```

### Fixtures Location

```
tests/fixtures/
├── ing-2017-12.txt           # Extracted text from PDF
├── ing-2017-12.expected.json # Expected parsed output
├── dkb-2024-01.txt
└── dkb-2024-01.expected.json
```

### Edge Cases to Test

- Multi-page statements
- Transactions spanning page breaks
- Foreign currency (DKB)
- Zero amounts (fee waivers)
- Very long vendor names
- Special characters in descriptions
