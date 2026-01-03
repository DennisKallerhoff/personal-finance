import { describe, it, expect } from 'vitest';
import { parseING } from '../../functions/shared/pdf/ing-parser';

const SAMPLE_ING_TEXT = `
Girokonto Nummer 1234567890
Kontoauszug Dezember 2017

Buchung  Buchung / Verwendungszweck                    Betrag (EUR)
Valuta

01.12.2017 Lastschrift ALTE LEIPZIGER BAUSPAR AG              -484,55
01.12.2017 00006919254 DEZEMBER 2017VERTRAG: 0 248651201
           Mandat: 000000019455825
           Referenz: 0000069192540

04.12.2017 Gutschrift EMPLOYER GMBH                          3.200,00
04.12.2017 Gehalt Dezember

05.12.2017 Lastschrift REWE MARKT GMBH                         -45,20
05.12.2017 Einkauf

Neuer Saldo                                                  2.670,25
`;

describe('parseING', () => {
  it('extracts all transactions', () => {
    const result = parseING(SAMPLE_ING_TEXT);
    expect(result.transactions).toHaveLength(3);
  });

  it('parses dates correctly', () => {
    const result = parseING(SAMPLE_ING_TEXT);
    expect(result.transactions[0].date).toBe('2017-12-01');
    expect(result.transactions[1].date).toBe('2017-12-04');
  });

  it('parses amounts correctly', () => {
    const result = parseING(SAMPLE_ING_TEXT);
    expect(result.transactions[0].amount).toBe(48455);
    expect(result.transactions[0].direction).toBe('debit');
    expect(result.transactions[1].amount).toBe(320000);
    expect(result.transactions[1].direction).toBe('credit');
  });

  it('extracts vendor names', () => {
    const result = parseING(SAMPLE_ING_TEXT);
    expect(result.transactions[0].raw_vendor).toBe('ALTE LEIPZIGER BAUSPAR AG');
    expect(result.transactions[2].raw_vendor).toBe('REWE MARKT GMBH');
  });

  it('captures metadata (Mandat, Referenz)', () => {
    const result = parseING(SAMPLE_ING_TEXT);
    expect(result.transactions[0].metadata?.mandat).toBe('000000019455825');
    expect(result.transactions[0].metadata?.referenz).toBe('0000069192540');
  });

  it('skips Neuer Saldo line', () => {
    const result = parseING(SAMPLE_ING_TEXT);
    const vendors = result.transactions.map(t => t.raw_vendor);
    expect(vendors).not.toContain('Neuer Saldo');
  });

  it('matches snapshot', () => {
    const result = parseING(SAMPLE_ING_TEXT);
    expect(result.transactions).toMatchSnapshot();
  });
});
