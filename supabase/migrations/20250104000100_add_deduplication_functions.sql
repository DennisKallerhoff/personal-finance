-- Deduplication Functions for Phase 4
-- Prevents duplicate transactions from being imported

-- Add content_hash column for deduplication
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS content_hash TEXT;

-- Create unique index to enforce uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_content_hash
ON transactions (account_id, content_hash)
WHERE content_hash IS NOT NULL;

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_transactions_content_hash_lookup
ON transactions (content_hash)
WHERE content_hash IS NOT NULL;

-- Function to compute transaction hash
-- Hash includes: account_id, date, amount, direction, normalized_vendor
-- This prevents true duplicates while allowing recurring monthly charges
CREATE OR REPLACE FUNCTION compute_transaction_hash(
  p_account_id UUID,
  p_date DATE,
  p_amount INTEGER,
  p_direction TEXT,
  p_normalized_vendor TEXT
)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT encode(
    sha256(
      (p_account_id::TEXT || '|' ||
       p_date::TEXT || '|' ||
       p_amount::TEXT || '|' ||
       p_direction || '|' ||
       LOWER(TRIM(COALESCE(p_normalized_vendor, ''))))::BYTEA
    ),
    'hex'
  )
$$;

-- Function to check for duplicate transaction
CREATE OR REPLACE FUNCTION is_duplicate_transaction(
  p_account_id UUID,
  p_date DATE,
  p_amount INTEGER,
  p_direction TEXT,
  p_normalized_vendor TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM transactions
    WHERE account_id = p_account_id
      AND content_hash = compute_transaction_hash(
        p_account_id, p_date, p_amount, p_direction, p_normalized_vendor
      )
  )
$$;

-- Down migration (reference):
-- DROP FUNCTION IF EXISTS is_duplicate_transaction(UUID, DATE, INTEGER, TEXT, TEXT);
-- DROP FUNCTION IF EXISTS compute_transaction_hash(UUID, DATE, INTEGER, TEXT, TEXT);
-- DROP INDEX IF EXISTS idx_transactions_content_hash_lookup;
-- DROP INDEX IF EXISTS idx_transactions_content_hash;
-- ALTER TABLE transactions DROP COLUMN IF EXISTS content_hash;
