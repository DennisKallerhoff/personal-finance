-- =====================================================
-- MIGRATION: Add change_transaction_category RPC
-- =====================================================
-- This RPC function atomically:
-- 1. Records category changes in category_overrides table
-- 2. Updates the transaction with new category
-- 3. Triggers learning via existing trigger
-- =====================================================

-- Atomic category change with audit trail
create or replace function change_transaction_category(
  p_transaction_id uuid,
  p_new_category_id uuid
)
returns void
language plpgsql
security definer
as $$
declare
  v_old_category_id uuid;
begin
  -- Get current category
  select category_id into v_old_category_id
  from transactions
  where id = p_transaction_id;

  -- Skip if no change
  if v_old_category_id is not distinct from p_new_category_id then
    return;
  end if;

  -- Record override (triggers learn_from_correction)
  insert into category_overrides (
    transaction_id,
    old_category_id,
    new_category_id,
    created_by
  ) values (
    p_transaction_id,
    v_old_category_id,
    p_new_category_id,
    auth.uid()
  );

  -- Update transaction
  update transactions
  set category_id = p_new_category_id,
      is_reviewed = true,
      confidence = 'high'
  where id = p_transaction_id;
end;
$$;

-- Grant execute to authenticated users
grant execute on function change_transaction_category(uuid, uuid) to authenticated;

-- Add comment
comment on function change_transaction_category is 'Atomically change transaction category with audit trail';
