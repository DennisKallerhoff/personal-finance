-- Create vendor_rules table for auto-categorization
create table vendor_rules (
  id uuid primary key default gen_random_uuid(),
  match_pattern text not null,
  normalized_vendor text not null,
  category_id uuid references categories(id) on delete cascade not null,
  match_type text not null check (match_type in ('exact', 'contains', 'regex')),
  priority integer not null default 100,  -- Lower = higher priority
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Enable RLS
alter table vendor_rules enable row level security;

create policy "Authenticated access"
on vendor_rules for all
to authenticated
using (true)
with check (true);

-- Indexes
create index idx_vendor_rules_active on vendor_rules(is_active) where is_active = true;
create index idx_vendor_rules_priority on vendor_rules(priority) where is_active = true;
create index idx_vendor_rules_category on vendor_rules(category_id);

-- Down migration (reference):
-- drop policy "Authenticated access" on vendor_rules;
-- drop table vendor_rules;
