-- =====================================================
-- MIGRATION: Restructure Categories
-- =====================================================
-- This migration replaces the old category structure with a new one:
--   A. AUSGABEN (Spending) - 8 top-level categories
--   B. EINNAHMEN (Income) - separate from spending
--   C. UMBUCHUNGEN (Transfers) - analytically neutral
--
-- Key changes:
-- - "Subscriptions" removed (it's a pattern/flag, not a category)
-- - "Familie & Kinder" added with kids-specific subcategories
-- - "Ferienimmobilie Mallorca" added as dedicated category
-- - "Sparen & Investieren" added
-- - Streaming services moved to "Freizeit & Lebensstil"
-- - Phone/Internet moved to "Wohnen"
-- =====================================================

-- First, clear existing category assignments from transactions
-- (they'll need to be re-categorized with the new structure)
UPDATE transactions SET category_id = NULL;

-- Delete existing vendor rules (they reference old category IDs)
DELETE FROM vendor_rules;

-- Delete existing categories
DELETE FROM categories;

-- =====================================================
-- A. AUSGABEN (Spending)
-- =====================================================

-- 1. Wohnen (Hauptwohnsitz)
INSERT INTO categories (id, name, parent_id, icon, color, sort_order)
VALUES ('c0000001-0001-0001-0001-000000000001', 'Wohnen', null, '🏠', '#8B4513', 1);

INSERT INTO categories (id, name, parent_id, icon, color, sort_order)
VALUES
  ('c0000002-0001-0001-0001-000000000001', 'Miete / Kredit', 'c0000001-0001-0001-0001-000000000001', '🔑', '#8B4513', 1),
  ('c0000002-0001-0001-0001-000000000002', 'Nebenkosten', 'c0000001-0001-0001-0001-000000000001', '💡', '#8B4513', 2),
  ('c0000002-0001-0001-0001-000000000003', 'Internet & Mobilfunk', 'c0000001-0001-0001-0001-000000000001', '📶', '#8B4513', 3),
  ('c0000002-0001-0001-0001-000000000004', 'Instandhaltung & Reparaturen', 'c0000001-0001-0001-0001-000000000001', '🔧', '#8B4513', 4),
  ('c0000002-0001-0001-0001-000000000005', 'Grundsteuer & Gebühren', 'c0000001-0001-0001-0001-000000000001', '📋', '#8B4513', 5),
  ('c0000002-0001-0001-0001-000000000006', 'Reinigung / Gartenhilfe', 'c0000001-0001-0001-0001-000000000001', '🧹', '#8B4513', 6);

-- 2. Ferienimmobilie – Mallorca
INSERT INTO categories (id, name, parent_id, icon, color, sort_order)
VALUES ('c0000001-0001-0001-0001-000000000002', 'Ferienimmobilie Mallorca', null, '🏝️', '#E67E22', 2);

INSERT INTO categories (id, name, parent_id, icon, color, sort_order)
VALUES
  ('c0000002-0001-0001-0001-000000000010', 'Finanzierung / Kredit', 'c0000001-0001-0001-0001-000000000002', '🏦', '#E67E22', 1),
  ('c0000002-0001-0001-0001-000000000011', 'Nebenkosten & Internet', 'c0000001-0001-0001-0001-000000000002', '💡', '#E67E22', 2),
  ('c0000002-0001-0001-0001-000000000012', 'Instandhaltung & Reparaturen', 'c0000001-0001-0001-0001-000000000002', '🔧', '#E67E22', 3),
  ('c0000002-0001-0001-0001-000000000013', 'Steuern & lokale Gebühren', 'c0000001-0001-0001-0001-000000000002', '📋', '#E67E22', 4),
  ('c0000002-0001-0001-0001-000000000014', 'Reinigung / Hausbetreuung', 'c0000001-0001-0001-0001-000000000002', '🧹', '#E67E22', 5),
  ('c0000002-0001-0001-0001-000000000015', 'Reisen zur Immobilie', 'c0000001-0001-0001-0001-000000000002', '✈️', '#E67E22', 6),
  ('c0000002-0001-0001-0001-000000000016', 'Einrichtung & Upgrades', 'c0000001-0001-0001-0001-000000000002', '🛋️', '#E67E22', 7);

-- 3. Mobilität
INSERT INTO categories (id, name, parent_id, icon, color, sort_order)
VALUES ('c0000001-0001-0001-0001-000000000003', 'Mobilität', null, '🚗', '#2196F3', 3);

INSERT INTO categories (id, name, parent_id, icon, color, sort_order)
VALUES
  ('c0000002-0001-0001-0001-000000000020', 'Fahrzeugfinanzierung / Leasing', 'c0000001-0001-0001-0001-000000000003', '🚙', '#2196F3', 1),
  ('c0000002-0001-0001-0001-000000000021', 'Kraftstoff / Laden', 'c0000001-0001-0001-0001-000000000003', '⛽', '#2196F3', 2),
  ('c0000002-0001-0001-0001-000000000022', 'Versicherung & Steuer', 'c0000001-0001-0001-0001-000000000003', '🛡️', '#2196F3', 3),
  ('c0000002-0001-0001-0001-000000000023', 'Wartung & Reifen', 'c0000001-0001-0001-0001-000000000003', '🔩', '#2196F3', 4),
  ('c0000002-0001-0001-0001-000000000024', 'ÖPNV / Gelegenheitsmobilität', 'c0000001-0001-0001-0001-000000000003', '🚇', '#2196F3', 5);

-- 4. Familie & Kinder
INSERT INTO categories (id, name, parent_id, icon, color, sort_order)
VALUES ('c0000001-0001-0001-0001-000000000004', 'Familie & Kinder', null, '👨‍👩‍👧‍👦', '#9C27B0', 4);

INSERT INTO categories (id, name, parent_id, icon, color, sort_order)
VALUES
  ('c0000002-0001-0001-0001-000000000030', 'Kita / Kindergarten', 'c0000001-0001-0001-0001-000000000004', '🎒', '#9C27B0', 1),
  ('c0000002-0001-0001-0001-000000000031', 'Kleidung & Schuhe', 'c0000001-0001-0001-0001-000000000004', '👟', '#9C27B0', 2),
  ('c0000002-0001-0001-0001-000000000032', 'Spielzeug & Bücher', 'c0000001-0001-0001-0001-000000000004', '🧸', '#9C27B0', 3),
  ('c0000002-0001-0001-0001-000000000033', 'Sport & Vereine (Kinder)', 'c0000001-0001-0001-0001-000000000004', '⚽', '#9C27B0', 4),
  ('c0000002-0001-0001-0001-000000000034', 'Schule / Kita-Zusatzkosten', 'c0000001-0001-0001-0001-000000000004', '📚', '#9C27B0', 5),
  ('c0000002-0001-0001-0001-000000000035', 'Babysitting & Betreuung', 'c0000001-0001-0001-0001-000000000004', '👶', '#9C27B0', 6);

-- 5. Alltag & Haushalt
INSERT INTO categories (id, name, parent_id, icon, color, sort_order)
VALUES ('c0000001-0001-0001-0001-000000000005', 'Alltag & Haushalt', null, '🛒', '#4CAF50', 5);

INSERT INTO categories (id, name, parent_id, icon, color, sort_order)
VALUES
  ('c0000002-0001-0001-0001-000000000040', 'Lebensmittel', 'c0000001-0001-0001-0001-000000000005', '🥦', '#4CAF50', 1),
  ('c0000002-0001-0001-0001-000000000041', 'Haushaltsbedarf', 'c0000001-0001-0001-0001-000000000005', '🧴', '#4CAF50', 2),
  ('c0000002-0001-0001-0001-000000000042', 'Drogerie & Pflege', 'c0000001-0001-0001-0001-000000000005', '🪥', '#4CAF50', 3),
  ('c0000002-0001-0001-0001-000000000043', 'Kleine Alltagsausgaben', 'c0000001-0001-0001-0001-000000000005', '🧾', '#4CAF50', 4);

-- 6. Gesundheit & Versicherungen
INSERT INTO categories (id, name, parent_id, icon, color, sort_order)
VALUES ('c0000001-0001-0001-0001-000000000006', 'Gesundheit & Versicherungen', null, '🏥', '#F44336', 6);

INSERT INTO categories (id, name, parent_id, icon, color, sort_order)
VALUES
  ('c0000002-0001-0001-0001-000000000050', 'Krankenversicherung', 'c0000001-0001-0001-0001-000000000006', '💳', '#F44336', 1),
  ('c0000002-0001-0001-0001-000000000051', 'Arzt, Zahnarzt, Medikamente', 'c0000001-0001-0001-0001-000000000006', '💊', '#F44336', 2),
  ('c0000002-0001-0001-0001-000000000052', 'Sonstige Versicherungen', 'c0000001-0001-0001-0001-000000000006', '🛡️', '#F44336', 3);

-- 7. Freizeit & Lebensstil
INSERT INTO categories (id, name, parent_id, icon, color, sort_order)
VALUES ('c0000001-0001-0001-0001-000000000007', 'Freizeit & Lebensstil', null, '🎉', '#FF9800', 7);

INSERT INTO categories (id, name, parent_id, icon, color, sort_order)
VALUES
  ('c0000002-0001-0001-0001-000000000060', 'Essen gehen & Take-away', 'c0000001-0001-0001-0001-000000000007', '🍽️', '#FF9800', 1),
  ('c0000002-0001-0001-0001-000000000061', 'Sport & Training (Erwachsene)', 'c0000001-0001-0001-0001-000000000007', '🏋️', '#FF9800', 2),
  ('c0000002-0001-0001-0001-000000000062', 'Streaming & Medien', 'c0000001-0001-0001-0001-000000000007', '📺', '#FF9800', 3),
  ('c0000002-0001-0001-0001-000000000063', 'Hobbys', 'c0000001-0001-0001-0001-000000000007', '🎨', '#FF9800', 4),
  ('c0000002-0001-0001-0001-000000000064', 'Geschenke & Feiern', 'c0000001-0001-0001-0001-000000000007', '🎁', '#FF9800', 5),
  ('c0000002-0001-0001-0001-000000000065', 'Reisen (nicht Mallorca)', 'c0000001-0001-0001-0001-000000000007', '🧳', '#FF9800', 6);

-- 8. Sparen & Investieren
INSERT INTO categories (id, name, parent_id, icon, color, sort_order)
VALUES ('c0000001-0001-0001-0001-000000000008', 'Sparen & Investieren', null, '📈', '#00BCD4', 8);

INSERT INTO categories (id, name, parent_id, icon, color, sort_order)
VALUES
  ('c0000002-0001-0001-0001-000000000070', 'Notgroschen', 'c0000001-0001-0001-0001-000000000008', '🏦', '#00BCD4', 1),
  ('c0000002-0001-0001-0001-000000000071', 'Langfristige Investments', 'c0000001-0001-0001-0001-000000000008', '📊', '#00BCD4', 2),
  ('c0000002-0001-0001-0001-000000000072', 'Altersvorsorge', 'c0000001-0001-0001-0001-000000000008', '🧓', '#00BCD4', 3),
  ('c0000002-0001-0001-0001-000000000073', 'Rücklagen für Kinder', 'c0000001-0001-0001-0001-000000000008', '👧', '#00BCD4', 4);

-- =====================================================
-- B. EINNAHMEN (Income)
-- =====================================================

INSERT INTO categories (id, name, parent_id, icon, color, sort_order)
VALUES ('c0000001-0001-0001-0001-000000000020', 'Einnahmen', null, '💰', '#4CAF50', 20);

INSERT INTO categories (id, name, parent_id, icon, color, sort_order)
VALUES
  ('c0000002-0001-0001-0001-000000000080', 'Gehalt', 'c0000001-0001-0001-0001-000000000020', '💵', '#4CAF50', 1),
  ('c0000002-0001-0001-0001-000000000081', 'Bonus / Variable Vergütung', 'c0000001-0001-0001-0001-000000000020', '🎯', '#4CAF50', 2),
  ('c0000002-0001-0001-0001-000000000082', 'Selbstständige Einnahmen', 'c0000001-0001-0001-0001-000000000020', '💼', '#4CAF50', 3),
  ('c0000002-0001-0001-0001-000000000083', 'Mieteinnahmen', 'c0000001-0001-0001-0001-000000000020', '🏠', '#4CAF50', 4),
  ('c0000002-0001-0001-0001-000000000084', 'Kapitalerträge', 'c0000001-0001-0001-0001-000000000020', '📈', '#4CAF50', 5),
  ('c0000002-0001-0001-0001-000000000085', 'Sonstige Einnahmen', 'c0000001-0001-0001-0001-000000000020', '💸', '#4CAF50', 6);

-- =====================================================
-- C. UMBUCHUNGEN (Transfers)
-- =====================================================

INSERT INTO categories (id, name, parent_id, icon, color, sort_order)
VALUES ('c0000001-0001-0001-0001-000000000030', 'Umbuchungen', null, '🔄', '#9E9E9E', 30);

INSERT INTO categories (id, name, parent_id, icon, color, sort_order)
VALUES
  ('c0000002-0001-0001-0001-000000000090', 'Konto → Konto', 'c0000001-0001-0001-0001-000000000030', '↔️', '#9E9E9E', 1),
  ('c0000002-0001-0001-0001-000000000091', 'Giro → Tagesgeld', 'c0000001-0001-0001-0001-000000000030', '🏦', '#9E9E9E', 2),
  ('c0000002-0001-0001-0001-000000000092', 'Giro → Depot', 'c0000001-0001-0001-0001-000000000030', '📊', '#9E9E9E', 3),
  ('c0000002-0001-0001-0001-000000000093', 'Kreditkartenabrechnung', 'c0000001-0001-0001-0001-000000000030', '💳', '#9E9E9E', 4),
  ('c0000002-0001-0001-0001-000000000094', 'Cash-Abhebungen', 'c0000001-0001-0001-0001-000000000030', '🏧', '#9E9E9E', 5);

-- =====================================================
-- Vendor Rules (updated to new category IDs)
-- =====================================================

INSERT INTO vendor_rules (match_pattern, normalized_vendor, category_id, match_type, priority)
VALUES
  -- Lebensmittel
  ('EDEKA', 'Edeka', 'c0000002-0001-0001-0001-000000000040', 'contains', 10),
  ('REWE', 'Rewe', 'c0000002-0001-0001-0001-000000000040', 'contains', 10),
  ('ALDI', 'Aldi', 'c0000002-0001-0001-0001-000000000040', 'contains', 10),
  ('LIDL', 'Lidl', 'c0000002-0001-0001-0001-000000000040', 'contains', 10),
  ('NETTO', 'Netto', 'c0000002-0001-0001-0001-000000000040', 'contains', 10),
  ('PENNY', 'Penny', 'c0000002-0001-0001-0001-000000000040', 'contains', 10),
  ('KAUFLAND', 'Kaufland', 'c0000002-0001-0001-0001-000000000040', 'contains', 10),

  -- Drogerie & Pflege
  ('ROSSMANN', 'Rossmann', 'c0000002-0001-0001-0001-000000000042', 'contains', 10),
  ('DM-DROGERIE', 'dm', 'c0000002-0001-0001-0001-000000000042', 'contains', 10),
  ('DM DROGERIE', 'dm', 'c0000002-0001-0001-0001-000000000042', 'contains', 10),

  -- Essen gehen & Take-away
  ('LIEFERANDO', 'Lieferando', 'c0000002-0001-0001-0001-000000000060', 'contains', 10),
  ('DELIVEROO', 'Deliveroo', 'c0000002-0001-0001-0001-000000000060', 'contains', 10),
  ('UBER EATS', 'Uber Eats', 'c0000002-0001-0001-0001-000000000060', 'contains', 10),
  ('MCDONALDS', 'McDonalds', 'c0000002-0001-0001-0001-000000000060', 'contains', 10),
  ('BURGER KING', 'Burger King', 'c0000002-0001-0001-0001-000000000060', 'contains', 10),
  ('STARBUCKS', 'Starbucks', 'c0000002-0001-0001-0001-000000000060', 'contains', 10),

  -- Mobilität > ÖPNV
  ('DEUTSCHE BAHN', 'Deutsche Bahn', 'c0000002-0001-0001-0001-000000000024', 'contains', 10),
  ('DB VERTRIEB', 'Deutsche Bahn', 'c0000002-0001-0001-0001-000000000024', 'contains', 10),
  ('BVG', 'BVG', 'c0000002-0001-0001-0001-000000000024', 'contains', 10),
  ('HVV', 'HVV', 'c0000002-0001-0001-0001-000000000024', 'contains', 10),

  -- Mobilität > Kraftstoff
  ('SHELL', 'Shell', 'c0000002-0001-0001-0001-000000000021', 'contains', 10),
  ('ARAL', 'Aral', 'c0000002-0001-0001-0001-000000000021', 'contains', 10),
  ('ESSO', 'Esso', 'c0000002-0001-0001-0001-000000000021', 'contains', 10),
  ('JET TANKSTELLE', 'Jet', 'c0000002-0001-0001-0001-000000000021', 'contains', 10),

  -- Taxi/Ride-sharing
  ('UBER', 'Uber', 'c0000002-0001-0001-0001-000000000024', 'exact', 10),
  ('FREE NOW', 'FreeNow', 'c0000002-0001-0001-0001-000000000024', 'contains', 10),
  ('BOLT', 'Bolt', 'c0000002-0001-0001-0001-000000000024', 'contains', 10),

  -- Flüge → Reisen
  ('EUROWINGS', 'Eurowings', 'c0000002-0001-0001-0001-000000000065', 'contains', 10),
  ('LUFTHANSA', 'Lufthansa', 'c0000002-0001-0001-0001-000000000065', 'contains', 10),
  ('RYANAIR', 'Ryanair', 'c0000002-0001-0001-0001-000000000065', 'contains', 10),
  ('EASYJET', 'easyJet', 'c0000002-0001-0001-0001-000000000065', 'contains', 10),

  -- Streaming & Medien
  ('NETFLIX', 'Netflix', 'c0000002-0001-0001-0001-000000000062', 'contains', 10),
  ('SPOTIFY', 'Spotify', 'c0000002-0001-0001-0001-000000000062', 'contains', 10),
  ('AMAZON PRIME', 'Amazon Prime', 'c0000002-0001-0001-0001-000000000062', 'contains', 10),
  ('DISNEY PLUS', 'Disney+', 'c0000002-0001-0001-0001-000000000062', 'contains', 10),
  ('APPLE MUSIC', 'Apple Music', 'c0000002-0001-0001-0001-000000000062', 'contains', 10),
  ('YOUTUBE PREMIUM', 'YouTube Premium', 'c0000002-0001-0001-0001-000000000062', 'contains', 10),

  -- Internet & Mobilfunk
  ('TELEKOM', 'Telekom', 'c0000002-0001-0001-0001-000000000003', 'contains', 10),
  ('VODAFONE', 'Vodafone', 'c0000002-0001-0001-0001-000000000003', 'contains', 10),
  ('O2', 'O2', 'c0000002-0001-0001-0001-000000000003', 'contains', 10),
  ('1&1', '1&1', 'c0000002-0001-0001-0001-000000000003', 'contains', 10),

  -- Kleidung → Familie
  ('ZALANDO', 'Zalando', 'c0000002-0001-0001-0001-000000000031', 'contains', 10),
  ('H&M', 'H&M', 'c0000002-0001-0001-0001-000000000031', 'contains', 10),
  ('ZARA', 'Zara', 'c0000002-0001-0001-0001-000000000031', 'contains', 10),
  ('C&A', 'C&A', 'c0000002-0001-0001-0001-000000000031', 'contains', 10),

  -- Sport & Training
  ('FITX', 'FitX', 'c0000002-0001-0001-0001-000000000061', 'contains', 10),
  ('MCFIT', 'McFit', 'c0000002-0001-0001-0001-000000000061', 'contains', 10),
  ('URBAN SPORTS', 'Urban Sports Club', 'c0000002-0001-0001-0001-000000000061', 'contains', 10),

  -- Generic (needs review)
  ('AMAZON', 'Amazon', 'c0000002-0001-0001-0001-000000000043', 'contains', 50),
  ('AMZN', 'Amazon', 'c0000002-0001-0001-0001-000000000043', 'contains', 50),
  ('PAYPAL', 'PayPal', 'c0000002-0001-0001-0001-000000000043', 'contains', 100);

-- Notify PostgREST to refresh schema cache
NOTIFY pgrst, 'reload schema';
