-- Create category_overrides table for audit trail
create table category_overrides (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid references transactions(id) on delete cascade not null,
  old_category_id uuid references categories(id) on delete set null,
  new_category_id uuid references categories(id) on delete set null not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

-- Enable RLS
alter table category_overrides enable row level security;

create policy "Authenticated access"
on category_overrides for all
to authenticated
using (true)
with check (true);

-- Indexes
create index idx_category_overrides_transaction on category_overrides(transaction_id);
create index idx_category_overrides_created on category_overrides(created_at desc);

-- Down migration (reference):
-- drop policy "Authenticated access" on category_overrides;
-- drop table category_overrides;
