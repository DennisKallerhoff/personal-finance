-- Create signal detection functions for Phase 6 analytics
-- These functions identify spending patterns, subscriptions, and anomalies

-- 1. Detect spending trend changes (±10% over 3 months)
create or replace function detect_trend_signals()
returns table(
  signal_type text,
  severity text,
  category_id uuid,
  category_name text,
  current_value integer,
  reference_value integer,
  change_pct numeric,
  month date
)
language sql
stable
as $$
  select
    case
      when pct_change_3m > 10 then 'TREND_UP'
      when pct_change_3m < -10 then 'TREND_DOWN'
      else 'STABLE'
    end as signal_type,
    case
      when abs(pct_change_3m) > 50 then 'alert'
      when abs(pct_change_3m) > 25 then 'warning'
      else 'info'
    end as severity,
    category_id,
    category_name,
    expenses as current_value,
    lag(expenses, 3) over (partition by category_id order by month) as reference_value,
    pct_change_3m as change_pct,
    month
  from category_trends
  where month >= current_date - interval '6 months'
    and pct_change_3m is not null
    and abs(pct_change_3m) > 10
  order by abs(pct_change_3m) desc
  limit 10;
$$;

-- 2. Detect recurring transactions (subscriptions)
create or replace function detect_subscriptions()
returns table(
  normalized_vendor text,
  frequency text,
  typical_amount integer,
  last_occurrence date,
  occurrence_count integer,
  confidence text
)
language sql
stable
as $$
  with vendor_patterns as (
    select
      normalized_vendor,
      array_agg(date order by date) as dates,
      array_agg(amount order by date) as amounts,
      count(*) as occurrence_count,
      stddev(amount) as amount_stddev,
      avg(amount) as avg_amount
    from transactions
    where direction = 'debit'
      and is_transfer = false
      and normalized_vendor is not null
      and date >= current_date - interval '12 months'
    group by normalized_vendor
    having count(*) >= 3
  ),
  interval_analysis as (
    select
      normalized_vendor,
      occurrence_count,
      avg_amount::integer as typical_amount,
      amount_stddev,
      dates[array_length(dates, 1)] as last_occurrence,
      -- Calculate average days between transactions
      (
        select avg(diff)
        from (
          select dates[i+1]::date - dates[i]::date as diff
          from generate_series(1, array_length(dates, 1) - 1) as i
        ) intervals
      ) as avg_interval_days,
      -- Calculate standard deviation of intervals
      (
        select stddev(diff)
        from (
          select dates[i+1]::date - dates[i]::date as diff
          from generate_series(1, array_length(dates, 1) - 1) as i
        ) intervals
      ) as interval_stddev
    from vendor_patterns
  )
  select
    normalized_vendor,
    case
      when avg_interval_days between 28 and 32 then 'monthly'
      when avg_interval_days between 85 and 95 then 'quarterly'
      when avg_interval_days between 360 and 370 then 'yearly'
      when avg_interval_days between 12 and 16 then 'biweekly'
      when avg_interval_days between 6 and 8 then 'weekly'
      else 'irregular'
    end as frequency,
    typical_amount,
    last_occurrence,
    occurrence_count::integer,
    case
      when interval_stddev < 3 and (amount_stddev / nullif(avg_amount, 0)) < 0.05 then 'high'
      when interval_stddev < 5 and (amount_stddev / nullif(avg_amount, 0)) < 0.15 then 'medium'
      else 'low'
    end as confidence
  from interval_analysis
  where avg_interval_days is not null
    and interval_stddev < 7  -- Consistent timing (within 1 week variance)
    and (amount_stddev / nullif(avg_amount::numeric, 0)) < 0.2  -- Amount variance < 20%
  order by confidence desc, occurrence_count desc;
$$;

-- 3. Detect large/unusual transactions
create or replace function detect_large_transactions(
  lookback_months integer default 3,
  threshold_cents integer default 10000  -- €100
)
returns table(
  transaction_id uuid,
  date date,
  vendor text,
  amount integer,
  category_name text
)
language sql
stable
as $$
  select
    t.id as transaction_id,
    t.date,
    t.normalized_vendor as vendor,
    t.amount,
    c.name as category_name
  from transactions t
  left join categories c on t.category_id = c.id
  where t.direction = 'debit'
    and t.is_transfer = false
    and t.amount > threshold_cents
    and t.date >= current_date - (lookback_months || ' months')::interval
    -- Exclude recurring (appears 2+ times with similar amount)
    and not exists (
      select 1
      from transactions t2
      where t2.normalized_vendor = t.normalized_vendor
        and t2.id != t.id
        and abs(t2.amount - t.amount) < (t.amount * 0.1)  -- Within 10%
        and t2.date >= current_date - interval '12 months'
    )
  order by t.amount desc, t.date desc
  limit 10;
$$;

-- 4. Detect new merchants (not seen in last 12 months)
create or replace function detect_new_merchants(
  lookback_days integer default 30
)
returns table(
  vendor text,
  first_occurrence date,
  amount integer,
  category_name text
)
language sql
stable
as $$
  with recent_transactions as (
    select
      normalized_vendor,
      min(date) as first_occurrence,
      sum(amount) as total_amount,
      category_id
    from transactions
    where date >= current_date - (lookback_days || ' days')::interval
      and direction = 'debit'
      and is_transfer = false
      and normalized_vendor is not null
    group by normalized_vendor, category_id
  )
  select
    rt.normalized_vendor as vendor,
    rt.first_occurrence,
    rt.total_amount as amount,
    c.name as category_name
  from recent_transactions rt
  left join categories c on rt.category_id = c.id
  where not exists (
    select 1
    from transactions t
    where t.normalized_vendor = rt.normalized_vendor
      and t.date < current_date - (lookback_days || ' days')::interval
      and t.date >= current_date - interval '12 months'
  )
  order by rt.first_occurrence desc;
$$;

-- Down migration (commented for reference)
-- drop function if exists detect_new_merchants(integer);
-- drop function if exists detect_large_transactions(integer, integer);
-- drop function if exists detect_subscriptions();
-- drop function if exists detect_trend_signals();
