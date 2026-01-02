-- Create reusable trigger function for updated_at
create or replace function update_updated_at()
returns trigger
language plpgsql
security invoker
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Apply to transactions table
create trigger update_transactions_updated_at
before update on transactions
for each row
execute function update_updated_at();

-- Down migration (reference):
-- drop trigger update_transactions_updated_at on transactions;
-- drop function update_updated_at();
