-- =====================================================
-- SEED DATA FOR HAUSHALTSBUCH
-- =====================================================
-- This file populates the database with default data
-- Run with: supabase db reset (includes seed)
-- =====================================================

-- 1. Default Accounts
-- =====================================================
insert into accounts (id, name, type, color, is_active)
values
  ('a0000001-0001-0001-0001-000000000001', 'ING Girokonto', 'checking', '#FF6200', true),
  ('a0000001-0001-0001-0001-000000000002', 'DKB Kreditkarte', 'credit_card', '#0077CC', true);

-- 2. Default Categories (German, 2-level hierarchy)
-- =====================================================

-- Top-level categories
insert into categories (id, name, parent_id, icon, color, sort_order)
values
  -- Expenses
  ('c0000001-0001-0001-0001-000000000001', 'Wohnen', null, '🏠', '#8B4513', 1),
  ('c0000001-0001-0001-0001-000000000002', 'Lebensmittel', null, '🛒', '#4CAF50', 2),
  ('c0000001-0001-0001-0001-000000000003', 'Transport', null, '🚗', '#2196F3', 3),
  ('c0000001-0001-0001-0001-000000000004', 'Freizeit', null, '🎉', '#9C27B0', 4),
  ('c0000001-0001-0001-0001-000000000005', 'Gesundheit', null, '💊', '#F44336', 5),
  ('c0000001-0001-0001-0001-000000000006', 'Versicherungen', null, '🛡️', '#607D8B', 6),
  ('c0000001-0001-0001-0001-000000000007', 'Abonnements', null, '📱', '#FF9800', 7),
  ('c0000001-0001-0001-0001-000000000008', 'Kleidung', null, '👕', '#E91E63', 8),
  ('c0000001-0001-0001-0001-000000000009', 'Bildung', null, '📚', '#3F51B5', 9),
  ('c0000001-0001-0001-0001-000000000010', 'Sonstiges', null, '📦', '#795548', 10),
  -- Income
  ('c0000001-0001-0001-0001-000000000020', 'Einkommen', null, '💰', '#4CAF50', 20),
  -- Transfers (special)
  ('c0000001-0001-0001-0001-000000000030', 'Umbuchungen', null, '🔄', '#9E9E9E', 30);

-- Sub-categories: Wohnen
insert into categories (id, name, parent_id, icon, color, sort_order)
values
  ('c0000002-0001-0001-0001-000000000001', 'Miete', 'c0000001-0001-0001-0001-000000000001', '🔑', '#8B4513', 1),
  ('c0000002-0001-0001-0001-000000000002', 'Nebenkosten', 'c0000001-0001-0001-0001-000000000001', '💡', '#8B4513', 2),
  ('c0000002-0001-0001-0001-000000000003', 'Hausrat', 'c0000001-0001-0001-0001-000000000001', '🛋️', '#8B4513', 3);

-- Sub-categories: Lebensmittel
insert into categories (id, name, parent_id, icon, color, sort_order)
values
  ('c0000002-0001-0001-0001-000000000010', 'Supermarkt', 'c0000001-0001-0001-0001-000000000002', '🏪', '#4CAF50', 1),
  ('c0000002-0001-0001-0001-000000000011', 'Restaurant', 'c0000001-0001-0001-0001-000000000002', '🍽️', '#4CAF50', 2),
  ('c0000002-0001-0001-0001-000000000012', 'Lieferdienst', 'c0000001-0001-0001-0001-000000000002', '🛵', '#4CAF50', 3);

-- Sub-categories: Transport
insert into categories (id, name, parent_id, icon, color, sort_order)
values
  ('c0000002-0001-0001-0001-000000000020', 'Öffentliche', 'c0000001-0001-0001-0001-000000000003', '🚇', '#2196F3', 1),
  ('c0000002-0001-0001-0001-000000000021', 'Tankstelle', 'c0000001-0001-0001-0001-000000000003', '⛽', '#2196F3', 2),
  ('c0000002-0001-0001-0001-000000000022', 'Taxi/Uber', 'c0000001-0001-0001-0001-000000000003', '🚕', '#2196F3', 3),
  ('c0000002-0001-0001-0001-000000000023', 'Flüge', 'c0000001-0001-0001-0001-000000000003', '✈️', '#2196F3', 4);

-- Sub-categories: Freizeit
insert into categories (id, name, parent_id, icon, color, sort_order)
values
  ('c0000002-0001-0001-0001-000000000030', 'Kino/Theater', 'c0000001-0001-0001-0001-000000000004', '🎬', '#9C27B0', 1),
  ('c0000002-0001-0001-0001-000000000031', 'Sport', 'c0000001-0001-0001-0001-000000000004', '🏃', '#9C27B0', 2),
  ('c0000002-0001-0001-0001-000000000032', 'Urlaub', 'c0000001-0001-0001-0001-000000000004', '🏖️', '#9C27B0', 3);

-- Sub-categories: Einkommen
insert into categories (id, name, parent_id, icon, color, sort_order)
values
  ('c0000002-0001-0001-0001-000000000050', 'Gehalt', 'c0000001-0001-0001-0001-000000000020', '💵', '#4CAF50', 1),
  ('c0000002-0001-0001-0001-000000000051', 'Nebeneinkommen', 'c0000001-0001-0001-0001-000000000020', '💸', '#4CAF50', 2),
  ('c0000002-0001-0001-0001-000000000052', 'Erstattungen', 'c0000001-0001-0001-0001-000000000020', '↩️', '#4CAF50', 3);

-- 3. Default Vendor Rules (common German merchants)
-- =====================================================
insert into vendor_rules (match_pattern, normalized_vendor, category_id, match_type, priority)
values
  -- Supermarkets (exact contains matches)
  ('EDEKA', 'Edeka', 'c0000002-0001-0001-0001-000000000010', 'contains', 10),
  ('REWE', 'Rewe', 'c0000002-0001-0001-0001-000000000010', 'contains', 10),
  ('ALDI', 'Aldi', 'c0000002-0001-0001-0001-000000000010', 'contains', 10),
  ('LIDL', 'Lidl', 'c0000002-0001-0001-0001-000000000010', 'contains', 10),
  ('NETTO', 'Netto', 'c0000002-0001-0001-0001-000000000010', 'contains', 10),
  ('PENNY', 'Penny', 'c0000002-0001-0001-0001-000000000010', 'contains', 10),
  ('KAUFLAND', 'Kaufland', 'c0000002-0001-0001-0001-000000000010', 'contains', 10),
  ('ROSSMANN', 'Rossmann', 'c0000002-0001-0001-0001-000000000010', 'contains', 15),
  ('DM-DROGERIE', 'dm', 'c0000002-0001-0001-0001-000000000010', 'contains', 15),

  -- Restaurants & Delivery
  ('LIEFERANDO', 'Lieferando', 'c0000002-0001-0001-0001-000000000012', 'contains', 10),
  ('DELIVEROO', 'Deliveroo', 'c0000002-0001-0001-0001-000000000012', 'contains', 10),
  ('UBER EATS', 'Uber Eats', 'c0000002-0001-0001-0001-000000000012', 'contains', 10),
  ('MCDONALDS', 'McDonalds', 'c0000002-0001-0001-0001-000000000011', 'contains', 10),
  ('BURGER KING', 'Burger King', 'c0000002-0001-0001-0001-000000000011', 'contains', 10),
  ('STARBUCKS', 'Starbucks', 'c0000002-0001-0001-0001-000000000011', 'contains', 10),

  -- Transport
  ('DEUTSCHE BAHN', 'Deutsche Bahn', 'c0000002-0001-0001-0001-000000000020', 'contains', 10),
  ('DB VERTRIEB', 'Deutsche Bahn', 'c0000002-0001-0001-0001-000000000020', 'contains', 10),
  ('BVG', 'BVG', 'c0000002-0001-0001-0001-000000000020', 'contains', 10),
  ('HVV', 'HVV', 'c0000002-0001-0001-0001-000000000020', 'contains', 10),
  ('SHELL', 'Shell', 'c0000002-0001-0001-0001-000000000021', 'contains', 10),
  ('ARAL', 'Aral', 'c0000002-0001-0001-0001-000000000021', 'contains', 10),
  ('UBER', 'Uber', 'c0000002-0001-0001-0001-000000000022', 'exact', 10),
  ('FREE NOW', 'FreeNow', 'c0000002-0001-0001-0001-000000000022', 'contains', 10),
  ('EUROWINGS', 'Eurowings', 'c0000002-0001-0001-0001-000000000023', 'contains', 10),
  ('LUFTHANSA', 'Lufthansa', 'c0000002-0001-0001-0001-000000000023', 'contains', 10),
  ('RYANAIR', 'Ryanair', 'c0000002-0001-0001-0001-000000000023', 'contains', 10),

  -- Subscriptions
  ('NETFLIX', 'Netflix', 'c0000001-0001-0001-0001-000000000007', 'contains', 10),
  ('SPOTIFY', 'Spotify', 'c0000001-0001-0001-0001-000000000007', 'contains', 10),
  ('AMAZON PRIME', 'Amazon Prime', 'c0000001-0001-0001-0001-000000000007', 'contains', 10),
  ('DISNEY PLUS', 'Disney+', 'c0000001-0001-0001-0001-000000000007', 'contains', 10),

  -- Online Shopping (lower priority - often miscategorized)
  ('AMAZON', 'Amazon', 'c0000001-0001-0001-0001-000000000010', 'contains', 50),
  ('AMZN', 'Amazon', 'c0000001-0001-0001-0001-000000000010', 'contains', 50),
  ('PAYPAL', 'PayPal', 'c0000001-0001-0001-0001-000000000010', 'contains', 100),
  ('ZALANDO', 'Zalando', 'c0000001-0001-0001-0001-000000000008', 'contains', 10),
  ('H&M', 'H&M', 'c0000001-0001-0001-0001-000000000008', 'contains', 10);

-- =====================================================
-- END SEED DATA
-- =====================================================
