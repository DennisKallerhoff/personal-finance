-- Complete import function with classification, deduplication, and transfer detection
-- This replaces the simple client-side insert with intelligent processing

CREATE OR REPLACE FUNCTION import_transactions_batch(
  p_account_id UUID,
  p_import_job_id UUID,
  p_transactions JSONB
)
RETURNS TABLE(
  total_processed INTEGER,
  inserted_count INTEGER,
  duplicate_count INTEGER,
  classified_count INTEGER,
  transfer_count INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_tx JSONB;
  v_tx_id UUID;
  v_normalized_vendor TEXT;
  v_content_hash TEXT;
  v_classification RECORD;
  v_is_transfer BOOLEAN;
  v_pair_id UUID;
  v_total INT := 0;
  v_inserted INT := 0;
  v_duplicates INT := 0;
  v_classified INT := 0;
  v_transfers INT := 0;
BEGIN
  -- Process each transaction
  FOR v_tx IN SELECT * FROM jsonb_array_elements(p_transactions)
  LOOP
    v_total := v_total + 1;

    -- Get normalized vendor (should already be in JSON from Edge Function)
    v_normalized_vendor := COALESCE(v_tx->>'normalized_vendor', v_tx->>'raw_vendor');

    -- Compute content hash for deduplication
    v_content_hash := compute_transaction_hash(
      p_account_id,
      (v_tx->>'date')::DATE,
      (v_tx->>'amount')::INTEGER,
      v_tx->>'direction',
      v_normalized_vendor
    );

    -- Check for duplicate
    IF is_duplicate_transaction(
      p_account_id,
      (v_tx->>'date')::DATE,
      (v_tx->>'amount')::INTEGER,
      v_tx->>'direction',
      v_normalized_vendor
    ) THEN
      v_duplicates := v_duplicates + 1;
      CONTINUE;  -- Skip duplicate
    END IF;

    -- Classify transaction
    SELECT * INTO v_classification
    FROM classify_transaction(v_tx->>'raw_vendor', v_normalized_vendor);

    IF v_classification.category_id IS NOT NULL THEN
      v_classified := v_classified + 1;
    END IF;

    -- Detect transfer keywords
    v_is_transfer := detect_transfer_keywords(
      v_tx->>'raw_vendor',
      COALESCE(v_tx->>'description', '')
    );

    IF v_is_transfer THEN
      v_transfers := v_transfers + 1;
    END IF;

    -- Insert transaction
    INSERT INTO transactions (
      account_id,
      import_job_id,
      date,
      amount,
      direction,
      raw_vendor,
      normalized_vendor,
      description,
      category_id,
      confidence,
      is_transfer,
      is_reviewed,
      content_hash
    ) VALUES (
      p_account_id,
      p_import_job_id,
      (v_tx->>'date')::DATE,
      (v_tx->>'amount')::INTEGER,
      v_tx->>'direction',
      v_tx->>'raw_vendor',
      v_normalized_vendor,
      v_tx->>'description',
      v_classification.category_id,
      v_classification.confidence,
      v_is_transfer,
      false,
      v_content_hash
    )
    RETURNING id INTO v_tx_id;

    v_inserted := v_inserted + 1;

    -- Try to pair transfer
    IF v_is_transfer THEN
      v_pair_id := find_transfer_pair(
        p_account_id,
        (v_tx->>'date')::DATE,
        (v_tx->>'amount')::INTEGER,
        v_tx->>'direction'
      );

      IF v_pair_id IS NOT NULL THEN
        PERFORM pair_transfers(v_tx_id, v_pair_id);
      END IF;
    END IF;
  END LOOP;

  -- Return statistics
  RETURN QUERY SELECT
    v_total,
    v_inserted,
    v_duplicates,
    v_classified,
    v_transfers;
END;
$$;

-- Down migration (reference):
-- DROP FUNCTION IF EXISTS import_transactions_batch(UUID, UUID, JSONB);
