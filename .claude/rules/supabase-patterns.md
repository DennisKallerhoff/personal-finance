# Supabase Patterns

Patterns and conventions for Supabase development in Haushaltsbuch.

---

## Single-Household Model

Haushaltsbuch is a **single-household** application:
- One Supabase project per household
- All authenticated users see all data
- No multi-tenancy complexity
- Family members are separate Supabase Auth users

---

## Database Patterns

### Table Structure

Every table follows this pattern:

```sql
create table transactions (
  id uuid primary key default gen_random_uuid(),
  -- business columns
  account_id uuid references accounts(id) not null,
  date date not null,
  amount integer not null,  -- cents, not euros
  -- audit columns
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table transactions enable row level security;
```

### Row Level Security (Single-Household)

Simple authenticated access for all tables:

```sql
-- All authenticated users can read all data
create policy "Authenticated read access"
on transactions for select
to authenticated
using (true);

-- All authenticated users can insert
create policy "Authenticated insert access"
on transactions for insert
to authenticated
with check (true);

-- All authenticated users can update
create policy "Authenticated update access"
on transactions for update
to authenticated
using (true)
with check (true);

-- All authenticated users can delete
create policy "Authenticated delete access"
on transactions for delete
to authenticated
using (true);
```

**Apply this pattern to:** transactions, accounts, categories, vendor_rules, import_jobs, comments, category_overrides.

### Amount Storage

Always store amounts as **integers (cents)**:

```sql
-- Good: Integer cents
amount integer not null  -- 12345 = €123,45

-- Bad: Decimal euros
amount decimal(10,2)  -- Floating point issues
```

Convert in application code:
```typescript
const euros = cents / 100
const cents = Math.round(euros * 100)
```

### JSONB for Metadata

Use JSONB for variable structure data:

```sql
create table import_jobs (
  id uuid primary key default gen_random_uuid(),
  filename text not null,
  status text not null default 'pending',
  -- Flexible error/warning storage
  errors jsonb default '[]'::jsonb,
  warnings jsonb default '[]'::jsonb,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- GIN index for containment queries
create index idx_import_jobs_metadata on import_jobs using gin (metadata);
```

### Category Hierarchy

Categories use adjacency list (simple, sufficient):

```sql
create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  parent_id uuid references categories(id),  -- null = top-level
  icon text,
  color text,
  sort_order integer default 0,
  created_at timestamptz default now()
);

-- Get full tree with recursive CTE
with recursive category_tree as (
  select id, name, parent_id, 0 as depth
  from categories
  where parent_id is null
  union all
  select c.id, c.name, c.parent_id, ct.depth + 1
  from categories c
  join category_tree ct on c.parent_id = ct.id
)
select * from category_tree order by depth, sort_order;
```

---

## Edge Function Patterns

### Standard Structure

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"
import { BadInputError, UpstreamFailError } from "../shared/errors.ts"

// Types
interface ImportInput {
  filename: string
  content: string
  account_id: string
}

interface Dependencies {
  supabase: SupabaseClient
  log: Logger
}

// Pure business logic (testable)
export async function processImport(
  input: ImportInput,
  deps: Dependencies
): Promise<ImportResult> {
  const { supabase, log } = deps

  // Validate input
  if (!input.filename) {
    throw new BadInputError('filename is required')
  }

  // Business logic here
  log.info("import_started", { filename: input.filename })

  return { success: true, transactions_count: 0 }
}

// Entry point (thin wrapper)
serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  )

  const deps: Dependencies = {
    supabase,
    log: console
  }

  try {
    const input = await req.json()
    const result = await processImport(input, deps)

    return new Response(
      JSON.stringify(result),
      { headers: { "Content-Type": "application/json" } }
    )
  } catch (error) {
    if (error instanceof BadInputError) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    }

    console.error("Unexpected error:", error)
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
})
```

### Error Classes

```typescript
// supabase/functions/shared/errors.ts

export class BadInputError extends Error {
  readonly status = 400
  constructor(message: string) {
    super(message)
    this.name = "BadInputError"
  }
}

export class UpstreamFailError extends Error {
  readonly status = 500
  constructor(message: string, public readonly cause?: Error) {
    super(message)
    this.name = "UpstreamFailError"
  }
}
```

### When to Use Edge Functions

**Use Edge Functions for:**
- PDF parsing (requires Deno runtime, pdf-lib)
- LLM calls for classification fallback
- Complex text normalization

**Do NOT use Edge Functions for:**
- Simple CRUD operations (use client directly)
- Business logic that can be SQL views/functions
- Anything that doesn't need server-side execution

### Environment Variables

Local development (`.env.local`):
```bash
SUPABASE_URL=http://localhost:54321
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...
ANTHROPIC_API_KEY=sk-ant-...
```

Access in code:
```typescript
const apiKey = Deno.env.get("ANTHROPIC_API_KEY")
if (!apiKey) throw new BadInputError("ANTHROPIC_API_KEY not configured")
```

---

## Migration Patterns

### Naming Convention

```
YYYYMMDDHHMMSS_description.sql

20250101120000_create_accounts_table.sql
20250101120100_create_categories_table.sql
20250101120200_create_transactions_table.sql
```

### Migration Structure

```sql
-- 20250101120000_create_accounts_table.sql

-- Up
create table accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('checking', 'credit_card')),
  color text,
  is_active boolean default true,
  created_at timestamptz default now()
);

alter table accounts enable row level security;

create policy "Authenticated access"
on accounts to authenticated
using (true);

-- Down (in comments for reference)
-- drop policy "Authenticated access" on accounts;
-- drop table accounts;
```

### Migration Rules

1. **Always reversible** — Include down migration in comments
2. **One concern per migration** — Don't mix table creation with data migration
3. **RLS in same migration** — Enable RLS and create policies together
4. **No data loss** — Adding columns: use defaults. Removing: migrate data first.

### Breaking Changes

If a migration changes data shape:

```sql
-- 20250115100000_rename_vendor_to_raw_vendor.sql
-- BREAKING: Renames 'vendor' column to 'raw_vendor'

-- Up
alter table transactions rename column vendor to raw_vendor;

-- Down
-- alter table transactions rename column raw_vendor to vendor;
```

1. Mark with `-- BREAKING:` comment
2. Update application code BEFORE running migration
3. Test rollback procedure

---

## Views for Computed Data

Use views for aggregations and joins:

```sql
-- Monthly spending by category
create view monthly_category_totals as
select
  date_trunc('month', t.date) as month,
  c.id as category_id,
  c.name as category_name,
  sum(t.amount) as total_cents,
  count(*) as transaction_count
from transactions t
left join categories c on t.category_id = c.id
where t.direction = 'debit'
  and t.is_transfer = false
group by date_trunc('month', t.date), c.id, c.name;
```

Query from client:
```typescript
const { data } = await supabase
  .from('monthly_category_totals')
  .select('*')
  .eq('month', '2025-01-01')
  .order('total_cents', { ascending: false })
```

---

## Database Functions

Use SQL functions for reusable logic:

```sql
-- Get transactions needing review
create or replace function get_review_queue()
returns setof transactions
language sql
stable
as $$
  select *
  from transactions
  where is_reviewed = false
    and (category_id is null or confidence = 'low')
  order by date desc
  limit 50;
$$;
```

Call from client:
```typescript
const { data } = await supabase.rpc('get_review_queue')
```

---

## Testing Patterns

### pgTAP for Database Tests

```sql
-- supabase/tests/transactions_test.sql
begin;
select plan(5);

-- Test table exists
select has_table('public', 'transactions');

-- Test RLS enabled
select row_security_active('public.transactions');

-- Test required columns
select has_column('public', 'transactions', 'account_id');
select has_column('public', 'transactions', 'amount');
select col_not_null('public', 'transactions', 'amount');

select * from finish();
rollback;
```

Run tests:
```bash
supabase test db
```

### Edge Function Tests

```typescript
// supabase/functions/import-pdf/index.test.ts
import { processImport } from "./index.ts"
import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts"

// Mock dependencies
const mockDeps = {
  supabase: {
    from: () => ({
      insert: () => ({ data: [], error: null })
    })
  },
  log: { info: () => {}, error: () => {} }
}

Deno.test("processImport validates filename", async () => {
  try {
    await processImport({ filename: '', content: '', account_id: 'x' }, mockDeps)
    throw new Error("Should have thrown")
  } catch (e) {
    assertEquals(e.name, "BadInputError")
  }
})
```

Run with:
```bash
deno test supabase/functions/
```

---

## File Organization

```
supabase/
├── config.toml
├── migrations/
│   ├── 20250101120000_create_accounts_table.sql
│   ├── 20250101120100_create_categories_table.sql
│   ├── 20250101120200_create_transactions_table.sql
│   ├── 20250101120300_create_vendor_rules_table.sql
│   └── 20250101120400_create_import_jobs_table.sql
├── functions/
│   ├── shared/
│   │   ├── errors.ts
│   │   ├── german-numbers.ts
│   │   └── pdf/
│   │       ├── ing-parser.ts
│   │       └── dkb-parser.ts
│   ├── import-pdf/
│   │   ├── index.ts
│   │   └── index.test.ts
│   └── classify-transaction/
│       └── index.ts
├── tests/
│   ├── accounts_test.sql
│   ├── transactions_test.sql
│   └── vendor_rules_test.sql
└── seed.sql
```

---

## Client Usage

### Initialize Once

```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
```

### Type Generation

Generate types from database:
```bash
supabase gen types typescript --local > src/types/database.ts
```

Use in queries:
```typescript
import type { Database } from '../types/database'

type Transaction = Database['public']['Tables']['transactions']['Row']
type TransactionInsert = Database['public']['Tables']['transactions']['Insert']
```

### Query Patterns

```typescript
// Select with relations
const { data: transactions } = await supabase
  .from('transactions')
  .select(`
    *,
    category:categories(id, name, color),
    account:accounts(id, name)
  `)
  .order('date', { ascending: false })
  .limit(100)

// Insert
const { data, error } = await supabase
  .from('transactions')
  .insert({
    account_id: accountId,
    date: '2025-01-15',
    amount: -4599,  // cents
    raw_vendor: 'EDEKA',
    direction: 'debit'
  })
  .select()
  .single()

// Update
const { error } = await supabase
  .from('transactions')
  .update({ category_id: newCategoryId, is_reviewed: true })
  .eq('id', transactionId)
```

---

## Real-time (Optional)

Enable real-time for tables that need live updates:

```sql
alter publication supabase_realtime add table transactions;
```

Subscribe in client:
```typescript
const channel = supabase
  .channel('transaction-updates')
  .on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'transactions' },
    (payload) => {
      console.log('New transaction:', payload.new)
      // Update local state
    }
  )
  .subscribe()

// Cleanup
channel.unsubscribe()
```

**Use sparingly** — Only for features that genuinely need real-time updates.
