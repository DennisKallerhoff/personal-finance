-- Add performance indexes for Phase 6 analytics queries
-- These optimize the views and signal detection functions

-- Optimize analytics queries by date and direction
create index if not exists idx_transactions_date_direction
  on transactions(date desc, direction)
  where is_transfer = false;

-- Optimize vendor pattern detection (subscription analysis)
create index if not exists idx_transactions_vendor_date
  on transactions(normalized_vendor, date desc)
  where direction = 'debit' and is_transfer = false;

-- Optimize category-based aggregations (monthly_summary, category_trends)
create index if not exists idx_transactions_category_date
  on transactions(category_id, date desc)
  where is_transfer = false;

-- Optimize import job lookups for Import Management page
create index if not exists idx_transactions_import_job
  on transactions(import_job_id);

-- Down migration (commented for reference)
-- drop index if exists idx_transactions_import_job;
-- drop index if exists idx_transactions_category_date;
-- drop index if exists idx_transactions_vendor_date;
-- drop index if exists idx_transactions_date_direction;
