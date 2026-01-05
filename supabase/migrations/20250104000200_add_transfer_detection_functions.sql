-- Transfer Detection Functions for Phase 4
-- Identifies internal transfers between accounts

-- Function to detect transfer keywords in transaction text
CREATE OR REPLACE FUNCTION detect_transfer_keywords(
  p_raw_vendor TEXT,
  p_description TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT
    p_raw_vendor ILIKE '%Übertrag%'
    OR p_raw_vendor ILIKE '%Umbuchung%'
    OR p_raw_vendor ILIKE '%Kreditkarte%'
    OR p_raw_vendor ILIKE '%Lastschrift%'
    OR COALESCE(p_description, '') ILIKE '%Übertrag%'
    OR COALESCE(p_description, '') ILIKE '%Umbuchung%'
$$;

-- Function to find transfer pair in another account
-- Returns transaction_id of pair, or NULL
CREATE OR REPLACE FUNCTION find_transfer_pair(
  p_account_id UUID,
  p_date DATE,
  p_amount INTEGER,
  p_direction TEXT
)
RETURNS UUID
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_pair_id UUID;
  v_opposite_direction TEXT;
BEGIN
  -- Determine opposite direction
  v_opposite_direction := CASE p_direction
    WHEN 'debit' THEN 'credit'
    ELSE 'debit'
  END;

  -- Find matching transaction in different account
  SELECT t.id INTO v_pair_id
  FROM transactions t
  WHERE t.account_id != p_account_id           -- Different account
    AND t.amount = p_amount                     -- Same amount
    AND t.direction = v_opposite_direction      -- Opposite direction
    AND t.date BETWEEN p_date - 5 AND p_date + 5  -- Within 5 days
    AND t.transfer_group_id IS NULL             -- Not already paired
  ORDER BY ABS(EXTRACT(EPOCH FROM (t.date - p_date)))  -- Closest date first
  LIMIT 1;

  RETURN v_pair_id;
END;
$$;

-- Function to pair transfers and assign group_id
-- Returns transfer_group_id
CREATE OR REPLACE FUNCTION pair_transfers(
  p_transaction_id UUID,
  p_pair_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_group_id UUID;
  v_transfer_category_id UUID;
BEGIN
  v_group_id := gen_random_uuid();

  -- Get or create "Umbuchungen" category
  SELECT id INTO v_transfer_category_id
  FROM categories
  WHERE name = 'Umbuchungen'
  LIMIT 1;

  -- If category doesn't exist, leave category_id null
  -- (will be handled by seed data)

  -- Update both transactions
  UPDATE transactions
  SET
    transfer_group_id = v_group_id,
    is_transfer = true,
    category_id = COALESCE(v_transfer_category_id, category_id)
  WHERE id IN (p_transaction_id, p_pair_id);

  RETURN v_group_id;
END;
$$;

-- Down migration (reference):
-- DROP FUNCTION IF EXISTS pair_transfers(UUID, UUID);
-- DROP FUNCTION IF EXISTS find_transfer_pair(UUID, DATE, INTEGER, TEXT);
-- DROP FUNCTION IF EXISTS detect_transfer_keywords(TEXT, TEXT);
