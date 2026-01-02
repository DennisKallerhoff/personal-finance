-- Create import_jobs table (must exist before transactions for FK)
create table import_jobs (
  id uuid primary key default gen_random_uuid(),
  filename text not null,
  account_id uuid references accounts(id) on delete restrict not null,
  file_hash text not null,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'completed', 'failed')),
  transactions_count integer default 0,
  duplicates_count integer default 0,
  errors jsonb default '[]'::jsonb,
  warnings jsonb default '[]'::jsonb,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  completed_at timestamptz
);

-- Enable RLS
alter table import_jobs enable row level security;

create policy "Authenticated access"
on import_jobs for all
to authenticated
using (true)
with check (true);

-- Indexes
create unique index idx_import_jobs_file_hash on import_jobs(file_hash, account_id);
create index idx_import_jobs_status on import_jobs(status);
create index idx_import_jobs_account on import_jobs(account_id);
create index idx_import_jobs_created on import_jobs(created_at desc);

-- Down migration (reference):
-- drop policy "Authenticated access" on import_jobs;
-- drop table import_jobs;
