-- Create comments table for transaction annotations
create table comments (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid references transactions(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete set null,
  text text not null,
  created_at timestamptz default now()
);

-- Enable RLS
alter table comments enable row level security;

create policy "Authenticated access"
on comments for all
to authenticated
using (true)
with check (true);

-- Index for fetching comments by transaction
create index idx_comments_transaction on comments(transaction_id);

-- Down migration (reference):
-- drop policy "Authenticated access" on comments;
-- drop table comments;
