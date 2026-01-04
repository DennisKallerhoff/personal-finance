-- Classification Functions for Phase 4
-- Matches transactions against vendor rules to auto-assign categories

-- Function to match vendor against rules
-- Returns first matching rule ordered by priority (lowest = highest precedence)
CREATE OR REPLACE FUNCTION match_vendor_rule(
  p_raw_vendor TEXT,
  p_normalized_vendor TEXT
)
RETURNS TABLE(
  rule_id UUID,
  category_id UUID,
  normalized_vendor TEXT,
  match_type TEXT,
  priority INTEGER,
  confidence TEXT
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    vr.id AS rule_id,
    vr.category_id,
    vr.normalized_vendor,
    vr.match_type,
    vr.priority,
    CASE
      WHEN vr.match_type = 'exact' THEN 'high'
      WHEN vr.match_type = 'contains' AND vr.priority <= 15 THEN 'high'
      WHEN vr.match_type = 'contains' THEN 'medium'
      WHEN vr.match_type = 'regex' THEN 'medium'
    END AS confidence
  FROM vendor_rules vr
  WHERE vr.is_active = true
    AND (
      CASE vr.match_type
        WHEN 'exact' THEN
          LOWER(p_normalized_vendor) = LOWER(vr.match_pattern)
        WHEN 'contains' THEN
          p_raw_vendor ILIKE '%' || vr.match_pattern || '%'
          OR p_normalized_vendor ILIKE '%' || vr.match_pattern || '%'
        WHEN 'regex' THEN
          p_raw_vendor ~* vr.match_pattern
          OR p_normalized_vendor ~* vr.match_pattern
      END
    )
  ORDER BY
    -- Exact matches win
    CASE WHEN vr.match_type = 'exact' THEN 0 ELSE 1 END,
    -- Then by priority (lower = better)
    vr.priority,
    -- Longer pattern = more specific
    LENGTH(vr.match_pattern) DESC
  LIMIT 1;
END;
$$;

-- Function to classify a single transaction
CREATE OR REPLACE FUNCTION classify_transaction(
  p_raw_vendor TEXT,
  p_normalized_vendor TEXT
)
RETURNS TABLE(
  category_id UUID,
  normalized_vendor TEXT,
  confidence TEXT,
  matched_rule_id UUID
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_rule RECORD;
BEGIN
  -- Try to match vendor rule
  SELECT * INTO v_rule
  FROM match_vendor_rule(p_raw_vendor, p_normalized_vendor);

  IF v_rule.rule_id IS NOT NULL THEN
    RETURN QUERY SELECT
      v_rule.category_id,
      v_rule.normalized_vendor,
      v_rule.confidence,
      v_rule.rule_id;
  ELSE
    -- No match - return nulls (will require manual review)
    RETURN QUERY SELECT
      NULL::UUID,
      p_normalized_vendor,
      NULL::TEXT,
      NULL::UUID;
  END IF;
END;
$$;

-- Down migration (reference):
-- DROP FUNCTION IF EXISTS classify_transaction(TEXT, TEXT);
-- DROP FUNCTION IF EXISTS match_vendor_rule(TEXT, TEXT);
