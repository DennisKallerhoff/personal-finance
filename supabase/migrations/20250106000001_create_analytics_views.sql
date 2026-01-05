-- Create analytics views for Phase 6 dashboard
-- Monthly trends with rolling averages and percent changes

create or replace view monthly_trends as
with monthly_totals as (
  select
    date_trunc('month', date)::date as month,
    sum(amount) filter (where direction = 'debit') as expenses,
    sum(amount) filter (where direction = 'credit') as income
  from transactions
  where is_transfer = false
  group by date_trunc('month', date)
)
select
  month,
  expenses,
  income,
  income - expenses as net,
  lag(expenses, 1) over (order by month) as prev_month_expenses,
  lag(income, 1) over (order by month) as prev_month_income,
  -- 3-month rolling average
  avg(expenses) over (
    order by month
    rows between 2 preceding and current row
  ) as rolling_avg_3m,
  -- Percent change from previous month
  case
    when lag(expenses, 1) over (order by month) > 0 then
      round(
        ((expenses::numeric - lag(expenses, 1) over (order by month)) /
         lag(expenses, 1) over (order by month)) * 100,
        2
      )
    else null
  end as pct_change_expenses,
  case
    when lag(income, 1) over (order by month) > 0 then
      round(
        ((income::numeric - lag(income, 1) over (order by month)) /
         lag(income, 1) over (order by month)) * 100,
        2
      )
    else null
  end as pct_change_income
from monthly_totals
order by month desc;

-- Category trends with 3-month rolling stats
create or replace view category_trends as
with category_monthly as (
  select
    date_trunc('month', t.date)::date as month,
    c.id as category_id,
    c.name as category_name,
    c.color as category_color,
    sum(t.amount) filter (where t.direction = 'debit') as expenses
  from transactions t
  left join categories c on t.category_id = c.id
  where t.is_transfer = false and c.id is not null
  group by date_trunc('month', t.date), c.id, c.name, c.color
)
select
  month,
  category_id,
  category_name,
  category_color,
  expenses,
  avg(expenses) over (
    partition by category_id
    order by month
    rows between 2 preceding and current row
  ) as rolling_avg_3m,
  -- Standard deviation for outlier detection
  stddev(expenses) over (
    partition by category_id
    order by month
    rows between 5 preceding and current row
  ) as stddev_6m,
  -- Percent change vs 3 months ago
  case
    when lag(expenses, 3) over (partition by category_id order by month) > 0 then
      round(
        ((expenses::numeric - lag(expenses, 3) over (partition by category_id order by month)) /
         lag(expenses, 3) over (partition by category_id order by month)) * 100,
        2
      )
    else null
  end as pct_change_3m
from category_monthly
order by category_id, month desc;

-- Down migration (commented for reference)
-- drop view if exists category_trends;
-- drop view if exists monthly_trends;
