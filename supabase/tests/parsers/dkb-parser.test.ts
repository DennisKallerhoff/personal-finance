import { describe, it, expect } from 'vitest';
import { parseDKB } from '../../functions/shared/pdf/dkb-parser';

const SAMPLE_DKB_TEXT = `
Ihre Abrechnung vom 01.12.2023 bis 31.12.2023

Datum    Datum     Angabe des Unternehmens /     Währung  Betrag  Kurs  Betrag in
Beleg    Buchung   Verwendungszweck                                     EUR

         01.12.23  Saldo letzte Abrechnung                              1.234,56 -

29.12.23 02.01.24  EDEKA MARTENS, Ammersbek                              42,05 -
                   Prämienmeilen              +21

30.12.23 03.01.24  PAYPAL *SPOTIFY, 35314369001                          9,99 -
                   Prämienmeilen              +4

         15.01.24  Lastschrift                                        1.286,60 +

02.01.24 04.01.24  JIM BLOCK, HAMBURG                                    15,90 -
                   Prämienmeilen              +7

Neuer Saldo                                                            52,50 -
`;

describe('parseDKB', () => {
  it('extracts all transactions', () => {
    const result = parseDKB(SAMPLE_DKB_TEXT);
    // 3 purchases + 1 payment
    expect(result.transactions).toHaveLength(4);
  });

  it('uses booking date (second date)', () => {
    const result = parseDKB(SAMPLE_DKB_TEXT);
    expect(result.transactions[0].date).toBe('2024-01-02');
  });

  it('parses DKB amounts with suffix', () => {
    const result = parseDKB(SAMPLE_DKB_TEXT);
    expect(result.transactions[0].amount).toBe(4205);
    expect(result.transactions[0].direction).toBe('debit');
  });

  it('detects Lastschrift as credit (payment)', () => {
    const result = parseDKB(SAMPLE_DKB_TEXT);
    const payment = result.transactions.find(t => t.raw_vendor.includes('Lastschrift'));
    expect(payment?.direction).toBe('credit');
  });

  it('extracts vendor and location', () => {
    const result = parseDKB(SAMPLE_DKB_TEXT);
    expect(result.transactions[0].raw_vendor).toContain('EDEKA');
  });

  it('handles PayPal transactions', () => {
    const result = parseDKB(SAMPLE_DKB_TEXT);
    const paypal = result.transactions.find(t => t.raw_vendor.includes('PAYPAL'));
    expect(paypal).toBeDefined();
  });

  it('skips Prämienmeilen and Saldo lines', () => {
    const result = parseDKB(SAMPLE_DKB_TEXT);
    const vendors = result.transactions.map(t => t.raw_vendor);
    expect(vendors.some(v => v.includes('Prämienmeilen'))).toBe(false);
    expect(vendors.some(v => v.includes('Saldo'))).toBe(false);
  });

  it('matches snapshot', () => {
    const result = parseDKB(SAMPLE_DKB_TEXT);
    expect(result.transactions).toMatchSnapshot();
  });
});
