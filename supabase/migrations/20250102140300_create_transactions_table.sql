-- Create transactions table (core of the application)
create table transactions (
  id uuid primary key default gen_random_uuid(),

  -- Relationships
  account_id uuid references accounts(id) on delete restrict not null,
  category_id uuid references categories(id) on delete set null,
  import_job_id uuid references import_jobs(id) on delete set null,

  -- Transaction data
  date date not null,
  amount integer not null check (amount >= 0),  -- Cents, always positive
  direction text not null check (direction in ('debit', 'credit')),

  -- Vendor information
  raw_vendor text,
  normalized_vendor text,
  description text,

  -- Classification
  confidence text check (confidence in ('high', 'medium', 'low')),
  is_transfer boolean default false,
  is_reviewed boolean default false,

  -- Transfer pairing (links two sides of a transfer)
  transfer_group_id uuid,

  -- Audit
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table transactions enable row level security;

create policy "Authenticated access"
on transactions for all
to authenticated
using (true)
with check (true);

-- Indexes for common query patterns
create index idx_transactions_date on transactions(date desc);
create index idx_transactions_account on transactions(account_id);
create index idx_transactions_category on transactions(category_id);
create index idx_transactions_import_job on transactions(import_job_id);
create index idx_transactions_needs_review on transactions(is_reviewed)
  where is_reviewed = false;
create index idx_transactions_transfer_group on transactions(transfer_group_id)
  where transfer_group_id is not null;

-- Composite index for monthly queries
create index idx_transactions_account_date on transactions(account_id, date desc);

-- Down migration (reference):
-- drop policy "Authenticated access" on transactions;
-- drop table transactions;
