import { parseDKBCSV } from './dkb-csv-parser.ts';
import { assertEquals, assertExists } from "https://deno.land/std@0.168.0/testing/asserts.ts";

// Sample CSV content from the user's file
const sampleCSV = `Miles & More Gold Credit Card;5310XXXXXXXX5214

Getätigt am;Ausgeführt am;Betrag;Waehrung;Verwendungszweck;Zahlungsart;Status;Betrag in Fremdwährung;Waehrung;Wechselkurs
05.01.2026;;-9,99;EUR;AMZN Mktp DE;e-commerce;Vorgemerkt;;;
05.01.2026;;-16,92;EUR;AMZN Mktp DE;e-commerce;Vorgemerkt;;;
04.01.2026;;-40;EUR;PAYPAL *flo.lemm;e-commerce;Vorgemerkt;;;
04.01.2026;;-50;EUR;PAYPAL *janine.kuethe;e-commerce;Vorgemerkt;;;
04.01.2026;;-10,05;EUR;Braaker Muehle;contactless;Vorgemerkt;;;
23.12.2025;24.12.2025;1.787,07;EUR;Lastschrift;direct-debit;Gebucht;;;
23.12.2025;23.12.2025;-11,5;EUR;monatlicher Kartenpreis;product-fee;Gebucht;;;
22.12.2025;;-49;EUR;http://all4tech.co;e-commerce;Abgelehnt;;;`;

Deno.test('parseDKBCSV - parses CSV format correctly', () => {
  const result = parseDKBCSV(sampleCSV);

  // Should have transactions (excluding rejected one)
  assertExists(result.transactions);
  assertEquals(result.transactions.length > 0, true);

  // Check metadata
  assertEquals(result.metadata.bank, 'dkb');
  assertEquals(result.metadata.format, 'csv');
  assertEquals(result.metadata.account_number, '5310XXXXXXXX5214');
});

Deno.test('parseDKBCSV - handles pending transactions', () => {
  const result = parseDKBCSV(sampleCSV);

  // Find a pending transaction (Vorgemerkt)
  const pending = result.transactions.find(t =>
    t.metadata?.status === 'Vorgemerkt'
  );

  assertExists(pending);
  assertExists(pending.metadata);
  assertEquals(pending.metadata.status, 'Vorgemerkt');
});

Deno.test('parseDKBCSV - handles booked transactions', () => {
  const result = parseDKBCSV(sampleCSV);

  // Find a booked transaction (Gebucht)
  const booked = result.transactions.find(t =>
    t.metadata?.status === 'Gebucht'
  );

  assertExists(booked);
  assertExists(booked.metadata);
  assertEquals(booked.metadata.status, 'Gebucht');
});

Deno.test('parseDKBCSV - skips rejected transactions', () => {
  const result = parseDKBCSV(sampleCSV);

  // Should not include the rejected transaction
  const rejected = result.transactions.find(t =>
    t.raw_vendor === 'http://all4tech.co'
  );

  assertEquals(rejected, undefined);
});

Deno.test('parseDKBCSV - detects transfers (Lastschrift)', () => {
  const result = parseDKBCSV(sampleCSV);

  // Find Lastschrift transaction
  const transfer = result.transactions.find(t =>
    t.raw_vendor === 'Lastschrift'
  );

  assertExists(transfer);
  assertExists(transfer.metadata);
  assertEquals(transfer.direction, 'credit'); // Positive amount = credit
  assertEquals(transfer.metadata.is_transfer, 'true');
});

Deno.test('parseDKBCSV - parses Amazon transactions', () => {
  const result = parseDKBCSV(sampleCSV);

  const amazon = result.transactions.find(t =>
    t.raw_vendor?.includes('AMZN')
  );

  assertExists(amazon);
  assertEquals(amazon.raw_vendor, 'AMZN Mktp DE');
  assertEquals(amazon.direction, 'debit'); // Negative = expense
  assertEquals(amazon.amount, 999); // 9.99 EUR = 999 cents
});

Deno.test('parseDKBCSV - parses PayPal transactions', () => {
  const result = parseDKBCSV(sampleCSV);

  const paypal = result.transactions.find(t =>
    t.raw_vendor?.includes('PAYPAL')
  );

  assertExists(paypal);
  assertExists(paypal.metadata);
  assertEquals(paypal.direction, 'debit');
  assertEquals(paypal.metadata.payment_type, 'e-commerce');
});

Deno.test('parseDKBCSV - parses amounts correctly', () => {
  const result = parseDKBCSV(sampleCSV);

  // Find the Lastschrift transaction with large amount
  const lastschrift = result.transactions.find(t =>
    t.raw_vendor === 'Lastschrift'
  );

  assertExists(lastschrift);
  assertEquals(lastschrift.amount, 178707); // 1787.07 EUR = 178707 cents
  assertEquals(lastschrift.direction, 'credit');
});

Deno.test('parseDKBCSV - stores payment types in metadata', () => {
  const result = parseDKBCSV(sampleCSV);

  // Check different payment types
  const ecommerce = result.transactions.find(t =>
    t.metadata?.payment_type === 'e-commerce'
  );
  const contactless = result.transactions.find(t =>
    t.metadata?.payment_type === 'contactless'
  );
  const fee = result.transactions.find(t =>
    t.metadata?.payment_type === 'product-fee'
  );

  assertExists(ecommerce);
  assertExists(contactless);
  assertExists(fee);
});

Deno.test('parseDKBCSV - handles empty execution dates', () => {
  const result = parseDKBCSV(sampleCSV);

  // Pending transactions have empty execution dates
  const pending = result.transactions.find(t =>
    t.metadata?.status === 'Vorgemerkt'
  );

  assertExists(pending);
  assertExists(pending.metadata);
  // Should use receipt date as primary when execution date is empty
  assertEquals(pending.date, pending.metadata.receipt_date);
});
