-- Monthly summary view: aggregates by month and category
create or replace view monthly_summary as
select
  date_trunc('month', t.date)::date as month,
  t.account_id,
  a.name as account_name,
  c.id as category_id,
  c.name as category_name,
  c.color as category_color,
  c.icon as category_icon,
  sum(t.amount) filter (where t.direction = 'debit') as expenses_cents,
  sum(t.amount) filter (where t.direction = 'credit') as income_cents,
  count(*) filter (where t.direction = 'debit') as expense_count,
  count(*) filter (where t.direction = 'credit') as income_count
from transactions t
join accounts a on t.account_id = a.id
left join categories c on t.category_id = c.id
where t.is_transfer = false  -- Exclude transfers from totals
group by
  date_trunc('month', t.date),
  t.account_id,
  a.name,
  c.id,
  c.name,
  c.color,
  c.icon;

-- Category summary view: totals by category (all time)
create or replace view category_summary as
select
  c.id as category_id,
  c.name as category_name,
  c.color as category_color,
  c.icon as category_icon,
  c.parent_id,
  sum(t.amount) filter (where t.direction = 'debit') as total_expenses_cents,
  sum(t.amount) filter (where t.direction = 'credit') as total_income_cents,
  count(*) as transaction_count,
  max(t.date) as last_transaction_date
from categories c
left join transactions t on t.category_id = c.id and t.is_transfer = false
group by c.id, c.name, c.color, c.icon, c.parent_id;

-- Needs review view: transactions requiring attention
create or replace view needs_review as
select
  t.*,
  a.name as account_name,
  c.name as category_name
from transactions t
join accounts a on t.account_id = a.id
left join categories c on t.category_id = c.id
where
  t.is_reviewed = false
  or t.confidence = 'low'
  or t.category_id is null
order by t.date desc;

-- Grant access to views
grant select on monthly_summary to authenticated;
grant select on category_summary to authenticated;
grant select on needs_review to authenticated;

-- Down migration (reference):
-- drop view needs_review;
-- drop view category_summary;
-- drop view monthly_summary;
