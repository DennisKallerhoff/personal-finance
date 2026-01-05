-- Create table for tracking dismissed signals (Phase 6 user decision)
-- Allows users to hide false positive signal detections

create table dismissed_signals (
  id uuid primary key default gen_random_uuid(),
  signal_type text not null check (signal_type in ('TREND_UP', 'TREND_DOWN', 'SUBSCRIPTION', 'LARGE_TRANSACTION', 'NEW_MERCHANT')),
  signal_key text not null, -- Unique identifier for the signal (e.g., "SUBSCRIPTION:Netflix", "TREND_UP:Groceries:2025-01")
  dismissed_at timestamptz default now(),
  dismissed_by uuid references auth.users(id),
  notes text, -- Optional reason for dismissal

  unique(signal_type, signal_key)
);

-- RLS: All authenticated users can manage dismissals
alter table dismissed_signals enable row level security;

create policy "Authenticated users can view dismissed signals"
  on dismissed_signals for select
  to authenticated
  using (true);

create policy "Authenticated users can dismiss signals"
  on dismissed_signals for insert
  to authenticated
  with check (true);

create policy "Authenticated users can delete dismissals"
  on dismissed_signals for delete
  to authenticated
  using (true);

-- Index for quick lookups
create index idx_dismissed_signals_lookup
  on dismissed_signals(signal_type, signal_key);

-- Down migration (commented for reference)
-- drop policy if exists "Authenticated users can delete dismissals" on dismissed_signals;
-- drop policy if exists "Authenticated users can dismiss signals" on dismissed_signals;
-- drop policy if exists "Authenticated users can view dismissed signals" on dismissed_signals;
-- drop index if exists idx_dismissed_signals_lookup;
-- drop table if exists dismissed_signals;
