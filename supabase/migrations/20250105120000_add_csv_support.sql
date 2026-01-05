-- Add CSV support: account_number and metadata fields
-- This enables importing CSV statements and storing format-specific data

-- Add account_number to accounts table
alter table accounts add column account_number text;

-- Index for matching CSV files to accounts
create index idx_accounts_account_number on accounts(account_number);

-- Add metadata JSONB column to transactions table
-- Stores format-specific data like:
-- - CSV: status, payment_type, receipt_date, execution_date, foreign_amount
-- - PDF: receipt_date, location, etc.
alter table transactions add column metadata jsonb default '{}'::jsonb;

-- GIN index for JSONB queries
create index idx_transactions_metadata on transactions using gin (metadata);

-- Down migration (reference):
-- drop index idx_transactions_metadata;
-- alter table transactions drop column metadata;
-- drop index idx_accounts_account_number;
-- alter table accounts drop column account_number;
