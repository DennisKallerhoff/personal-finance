-- Learning Trigger for Phase 4
-- Automatically creates vendor rules after 2+ corrections to same vendor

-- Function triggered when user corrects a category
CREATE OR REPLACE FUNCTION learn_from_correction()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_vendor TEXT;
  v_correction_count INTEGER;
  v_new_rule_id UUID;
BEGIN
  -- Get normalized vendor from transaction
  SELECT normalized_vendor INTO v_vendor
  FROM transactions
  WHERE id = NEW.transaction_id;

  -- Skip if vendor is null or empty
  IF v_vendor IS NULL OR TRIM(v_vendor) = '' THEN
    RETURN NEW;
  END IF;

  -- Count corrections for same vendor to same category
  SELECT COUNT(*) INTO v_correction_count
  FROM category_overrides co
  JOIN transactions t ON co.transaction_id = t.id
  WHERE t.normalized_vendor = v_vendor
    AND co.new_category_id = NEW.new_category_id;

  -- If corrected 2+ times, create vendor rule
  IF v_correction_count >= 2 THEN
    -- Check if rule already exists
    IF NOT EXISTS (
      SELECT 1 FROM vendor_rules
      WHERE match_pattern = v_vendor
        AND category_id = NEW.new_category_id
        AND is_active = true
    ) THEN
      INSERT INTO vendor_rules (
        match_pattern,
        normalized_vendor,
        category_id,
        match_type,
        priority,
        is_active
      ) VALUES (
        v_vendor,
        v_vendor,
        NEW.new_category_id,
        'contains',
        10,  -- High priority for learned rules
        true
      )
      RETURNING id INTO v_new_rule_id;

      -- Log rule creation
      RAISE NOTICE 'Created vendor rule % for vendor % → category %',
        v_new_rule_id, v_vendor, NEW.new_category_id;

      -- Apply rule retroactively to unreviewed transactions
      PERFORM apply_rule_retroactively(v_new_rule_id);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger on category_overrides insert
CREATE TRIGGER learn_from_correction_trigger
AFTER INSERT ON category_overrides
FOR EACH ROW
EXECUTE FUNCTION learn_from_correction();

-- Function to apply new rule to existing unreviewed transactions
CREATE OR REPLACE FUNCTION apply_rule_retroactively(
  p_rule_id UUID
)
RETURNS INTEGER  -- Count of updated transactions
LANGUAGE plpgsql
AS $$
DECLARE
  v_rule RECORD;
  v_count INTEGER;
BEGIN
  -- Get rule details
  SELECT * INTO v_rule FROM vendor_rules WHERE id = p_rule_id;

  -- Update unreviewed transactions matching this rule
  UPDATE transactions t
  SET
    category_id = v_rule.category_id,
    confidence = 'high'
  WHERE t.is_reviewed = false
    AND t.category_id IS DISTINCT FROM v_rule.category_id
    AND (
      t.raw_vendor ILIKE '%' || v_rule.match_pattern || '%'
      OR t.normalized_vendor ILIKE '%' || v_rule.match_pattern || '%'
    );

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN v_count;
END;
$$;

-- Down migration (reference):
-- DROP TRIGGER IF EXISTS learn_from_correction_trigger ON category_overrides;
-- DROP FUNCTION IF EXISTS learn_from_correction();
-- DROP FUNCTION IF EXISTS apply_rule_retroactively(UUID);
