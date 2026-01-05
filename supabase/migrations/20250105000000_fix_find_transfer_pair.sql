-- Fix find_transfer_pair function
-- The EXTRACT(EPOCH FROM date - date) doesn't work because date subtraction returns integer
-- Changed to just use the integer difference directly

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
  ORDER BY ABS(t.date - p_date)  -- Closest date first (returns days as integer)
  LIMIT 1;

  RETURN v_pair_id;
END;
$$;

-- Down migration (no changes needed, function can be rolled back)
