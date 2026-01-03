import { describe, it, expect } from 'vitest';
import { parseGermanAmount, formatGermanAmount } from '../../functions/shared/german-numbers';

describe('parseGermanAmount', () => {
  it('parses simple amounts', () => {
    expect(parseGermanAmount('45,20')).toBe(4520);
    expect(parseGermanAmount('1,00')).toBe(100);
  });

  it('parses amounts with thousands separator', () => {
    expect(parseGermanAmount('1.234,56')).toBe(123456);
    expect(parseGermanAmount('12.345,67')).toBe(1234567);
  });

  it('parses negative amounts (prefix)', () => {
    expect(parseGermanAmount('-45,20')).toBe(-4520);
    expect(parseGermanAmount('-1.234,56')).toBe(-123456);
  });

  it('parses DKB format (suffix minus)', () => {
    expect(parseGermanAmount('45,20 -')).toBe(-4520);
    expect(parseGermanAmount('1.234,56 -')).toBe(-123456);
  });

  it('parses DKB format (suffix plus)', () => {
    expect(parseGermanAmount('45,20 +')).toBe(4520);
    expect(parseGermanAmount('1.234,56 +')).toBe(123456);
  });
});

describe('formatGermanAmount', () => {
  it('formats positive amounts', () => {
    expect(formatGermanAmount(4520)).toBe('45,20 €');
    expect(formatGermanAmount(123456)).toBe('1.234,56 €');
  });

  it('formats negative amounts', () => {
    expect(formatGermanAmount(-4520)).toBe('-45,20 €');
  });
});
