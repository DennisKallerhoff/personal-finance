-- Create categories table (hierarchical via parent_id)
create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  parent_id uuid references categories(id) on delete set null,
  icon text,  -- Single emoji character
  color text check (color ~ '^#[0-9A-Fa-f]{6}$'),
  sort_order integer default 0,
  created_at timestamptz default now()
);

-- Enable RLS
alter table categories enable row level security;

create policy "Authenticated access"
on categories for all
to authenticated
using (true)
with check (true);

-- Indexes
create index idx_categories_parent on categories(parent_id);
create index idx_categories_sort on categories(sort_order);

-- Down migration (reference):
-- drop policy "Authenticated access" on categories;
-- drop table categories;
