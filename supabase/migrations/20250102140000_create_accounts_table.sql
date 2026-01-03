-- Create accounts table
create table accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('checking', 'credit_card')),
  color text check (color ~ '^#[0-9A-Fa-f]{6}$'),
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Enable RLS
alter table accounts enable row level security;

-- Single-household: all authenticated users have full access
create policy "Authenticated access"
on accounts for all
to authenticated
using (true)
with check (true);

-- Index for active accounts
create index idx_accounts_is_active on accounts(is_active) where is_active = true;

-- Down migration (reference):
-- drop policy "Authenticated access" on accounts;
-- drop table accounts;
