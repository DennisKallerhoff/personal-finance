# Haushaltsbuch

A personal finance consolidation app for household spending visibility.

---

## Quick Start

**Implementation planning:**
```
/compound-engineering:workflows:plan [feature description]
```

**Code review:**
```
/compound-engineering:workflows:review
```

---

## Key Documents

### Product Doctrine
- `CONSTITUTION.md` — What Haushaltsbuch is, should be, and must never become

### Development Rules
- `.claude/rules/coding-laws.md` — Core development principles
- `.claude/rules/supabase-patterns.md` — Supabase/Postgres/Edge Function patterns
- `.claude/rules/pdf-parsing.md` — PDF extraction patterns (ING, credit card)
- `.claude/rules/frontend-patterns.md` — React/TypeScript patterns and anti-patterns

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      HAUSHALTSBUCH                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐     ┌──────────────┐     ┌─────────────┐ │
│  │  PDF Upload  │ ──► │   Parsing    │ ──► │  Normalize  │ │
│  │  (Frontend)  │     │ (Edge Func)  │     │  + Dedupe   │ │
│  └──────────────┘     └──────────────┘     └─────────────┘ │
│                                                   │         │
│                                                   ▼         │
│  ┌──────────────┐     ┌──────────────┐     ┌─────────────┐ │
│  │   Display    │ ◄── │   Postgres   │ ◄── │  Classify   │ │
│  │  (Frontend)  │     │   (Truth)    │     │ (Rules+LLM) │ │
│  └──────────────┘     └──────────────┘     └─────────────┘ │
│                                                             │
│  V2: MCP Server for conversational queries                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

### Backend
| Layer | Technology |
|-------|------------|
| Database | Supabase Postgres (Cloud) |
| Auth | Supabase Auth (email/password) |
| Edge Functions | Deno (PDF parsing, LLM calls) |
| LLM | Claude (classification fallback) |

### Frontend
| Layer | Technology |
|-------|------------|
| Framework | React + Vite |
| Language | TypeScript |
| Styling | TailwindCSS |
| Components | shadcn/ui |
| Charts | Recharts |
| Forms | React Hook Form + Zod |
| Routing | React Router |
| Hosting | Cloudflare Pages |

### Why This Stack
- **No unnecessary complexity** — Supabase client directly, no TanStack Query
- **shadcn/ui** — Copy-paste components, you own the code
- **Vite** — Fast builds, simple config
- **Cloudflare Pages** — Free, fast, easy deploys

---

## Development Laws (Summary)

These override generic best practices.

1. **Simplicity over abstraction** — Explicit, readable code
2. **Postgres is truth** — All logic explainable via stored data
3. **Functions before frameworks** — Pure functions, no magic
4. **Data shapes are contracts** — Schema changes are breaking changes
5. **No premature generalization** — Optimize for today
6. **Conservative classification** — When unsure, mark for review
7. **Compound knowledge** — Every correction creates a rule
8. **Ask when unsure** — Clarify before coding

**Supabase-specific:**
- RLS for multi-user (family) access
- Edge Functions for PDF parsing + LLM calls
- Migrations required, reversible

---

## Data Model (Core Tables)

### accounts
```sql
id, name, type (checking|credit_card), color, is_active
```

### categories
```sql
id, name, parent_id, icon, color, sort_order
```

### transactions
```sql
id, account_id, date, amount, direction (debit|credit),
raw_vendor, normalized_vendor, description,
category_id, confidence, is_transfer, is_reviewed,
import_job_id, created_at
```

### vendor_rules
```sql
id, match_pattern, normalized_vendor, category_id,
match_type (exact|contains|regex), priority, created_at
```

### import_jobs
```sql
id, filename, account_id, file_hash, status,
transactions_count, errors, warnings, created_at
```

### comments
```sql
id, transaction_id, user_id, text, created_at
```

### category_overrides
```sql
id, transaction_id, old_category_id, new_category_id,
created_by, created_at
```

---

## Import Pipeline

### 1. Upload
- Accept PDF (primary) or CSV (fallback)
- Hash file to detect duplicates
- Create import_job record

### 2. Extract
- Detect template (ING vs credit card)
- Parse PDF to text
- Segment into transaction blocks

### 3. Normalize
- Parse dates to ISO
- Handle German number format (1.234,56)
- Extract amount + direction
- Normalize vendor names

### 4. Deduplicate
- Match by: date (±1 day), amount, vendor similarity
- Mark duplicates, keep first

### 5. Detect Transfers
- Symmetric amounts between accounts
- Same/adjacent dates
- Keywords: "Übertrag", "Kreditkarte"

### 6. Classify
- Match against vendor_rules (highest priority wins)
- LLM fallback if no rule matches
- Set confidence score

### 7. Store
- Insert transactions
- Update import_job status

---

## Classification Logic

```
1. Exact vendor_rule match? → Apply category, confidence=high
2. Contains/regex match? → Apply category, confidence=medium
3. LLM classification? → Apply category, confidence=low
4. No match? → category=null, needs_review=true
```

### Learning from Corrections

When user changes category:
1. Create category_override (audit trail)
2. If same vendor corrected 2+ times → create vendor_rule
3. Apply rule to future transactions

---

## Pages

### Home (3 Tabs)

**Tab A: Overview**
- Month selector
- Key metrics (expenses, income, net)
- Top 5 categories
- Mini trend chart

**Tab B: Trends**
- Monthly totals line chart
- Category breakdown over time
- Rolling averages

**Tab C: Signals**
- Trend changes
- Large transactions
- New subscriptions detected

### Transactions
- Filterable list
- Inline category editing
- Inline commenting
- Batch actions

### Import Management
- Upload new files
- Import history
- Error/warning review

### Settings
- Categories (add, rename, merge)
- Vendor rules
- Accounts
- Export data

---

## Signal Types

| Signal | Trigger |
|--------|---------|
| **Trend Up** | Category +10% over 3 months |
| **Trend Down** | Category -10% over 3 months |
| **Monthly Outlier** | Z-score > 1.5 vs rolling avg |
| **Large Transaction** | Single item > €100 AND not recurring |
| **New Subscription** | Vendor appears monthly ±3 days |
| **New Merchant** | Vendor not seen in 12 months |

---

## Security

### Authentication
- Supabase Auth with email/password
- Family members as separate users
- Single household = single Supabase project

### Row Level Security
```sql
-- Transactions visible to all household members
create policy "Household access"
on transactions
to authenticated
using (true);  -- Single household, all users can see all

-- For multi-household (future):
-- using (household_id = get_user_household())
```

### Data Privacy
- No external analytics
- No telemetry
- PDF content never leaves your infra
- LLM calls send only: vendor + amount + description

---

## V2: MCP Integration

### Tools to Expose
```
haushaltsbuch_query_spending     # "How much on X in Y?"
haushaltsbuch_list_transactions  # Filter by category/vendor/date
haushaltsbuch_get_trends         # Monthly/category trends
haushaltsbuch_list_subscriptions # Detected recurring charges
```

### Not Exposed
- Import functions (use UI)
- Category/rule management (use UI)
- Comments (use UI)

---

## File Structure

```
haushaltsbuch/
├── CLAUDE.md                 # This file
├── CONSTITUTION.md           # Product doctrine
├── .claude/
│   └── rules/
│       ├── coding-laws.md
│       ├── supabase-patterns.md
│       ├── pdf-parsing.md
│       └── frontend-patterns.md
├── supabase/
│   ├── config.toml
│   ├── migrations/
│   ├── functions/
│   │   ├── shared/
│   │   │   ├── errors.ts
│   │   │   ├── german-numbers.ts
│   │   │   └── pdf/
│   │   │       ├── ing-parser.ts
│   │   │       └── dkb-parser.ts
│   │   ├── import-pdf/
│   │   │   └── index.ts
│   │   └── mcp-server/        # V2
│   │       └── index.ts
│   ├── tests/
│   └── seed.sql
├── web/                       # Frontend (React + Vite)
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/            # shadcn components
│   │   │   └── ...
│   │   ├── pages/
│   │   │   ├── home.tsx
│   │   │   ├── transactions.tsx
│   │   │   ├── import.tsx
│   │   │   └── settings.tsx
│   │   ├── lib/
│   │   │   ├── supabase.ts
│   │   │   └── format.ts
│   │   └── types/
│   │       └── database.ts    # Generated from Supabase
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── package.json
├── tests/
│   ├── parsers/
│   │   ├── ing.test.ts
│   │   └── dkb.test.ts
│   └── fixtures/
│       ├── ing-sample.txt
│       └── dkb-sample.txt
└── docs/
    └── pdf-samples/           # Reference PDFs
```

---

## Testing Strategy

### What to Test (Risky Parts Only)

| Layer | Test Type | Tool |
|-------|-----------|------|
| PDF Parsers | Snapshot tests | Vitest |
| German Numbers | Unit tests | Vitest |
| Vendor Rules | Unit tests | Vitest |
| Database Views | SQL tests | pgTAP |

### What NOT to Test
- UI components (low risk, change often)
- Supabase client calls (trust the SDK)
- Simple CRUD operations

### Test Commands
```bash
# Run parser/unit tests
npm test

# Run database tests
supabase test db
```

### Snapshot Testing for Parsers
```typescript
// tests/parsers/ing.test.ts
import { parseING } from '../../supabase/functions/shared/pdf/ing-parser'
import ingFixture from '../fixtures/ing-sample.txt'

test('ING statement parsing', () => {
  const result = parseING(ingFixture)
  expect(result.transactions).toMatchSnapshot()
})
```

---

## Before Writing Code

1. Read `CONSTITUTION.md` for product philosophy
2. Check if feature passes the 5 tests (Answer, Compound, Simplicity, Privacy, Drift)
3. Start with data model — what gets stored?
4. Keep Edge Functions thin — business logic in shared modules

---

## Quick Reference

| Concept | Rule |
|---------|------|
| Categories | Hierarchical, user-defined |
| Classification | Rules first, LLM fallback |
| Confidence | high/medium/low based on match type |
| Transfers | Excluded from totals by default |
| Signals | Observations, not judgments |
| MCP | Read-only queries (V2) |
