-- =====================================================
-- MIGRATION: Add is_flagged to transactions
-- =====================================================
-- Adds a flag for marking transactions that need discussion or special attention
-- =====================================================

alter table transactions
add column is_flagged boolean not null default false;

comment on column transactions.is_flagged is 'Flagged for discussion/review';

-- Create index for filtering flagged transactions
create index idx_transactions_is_flagged on transactions(is_flagged) where is_flagged = true;
