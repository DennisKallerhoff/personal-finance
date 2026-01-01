# Haushaltsbuch Constitution

**What this product is, should be, and must never become.**

---

## The Core Problem

> You have bank statements and credit card PDFs scattered across months.
> You don't know where your money goes.
> You can't answer: "How much did we spend on groceries this year?"

---

## What Haushaltsbuch Is

A **personal ledger** that:

1. **Consolidates** all transactions from your accounts into one view
2. **Classifies** spending into meaningful categories automatically
3. **Compounds knowledge** — learns your merchants over time
4. **Surfaces patterns** — trends, outliers, subscriptions
5. **Enables household discussion** — comments on transactions

It is a **system of record** for your household spending.

---

## What Haushaltsbuch Is NOT

### Not a budgeting app
We don't set budgets or nag about overspending. We show reality. You decide what to do with it.

### Not a bank aggregator
We don't connect to bank APIs or scrape accounts. You upload files. You control your data.

### Not a financial advisor
We don't recommend investments, savings rates, or financial products. We show where money went.

### Not a shared expense splitter
We don't calculate who owes whom. This is a household ledger, not Splitwise.

### Not an accounting system
No double-entry bookkeeping, no tax categories, no invoices. Personal spending only.

---

## Core Principles

### 1. Your Data, Your Control
- All data stays in your Supabase instance
- No third-party analytics, no telemetry
- Export everything anytime
- Delete everything anytime

### 2. PDF-First, Reality-Based
- We parse what your bank actually sends you
- No idealized data formats
- Handle messy OCR, weird formatting, German number conventions
- Partial success is better than total failure

### 3. Compound Knowledge
- Every manual correction teaches the system
- Vendor rules accumulate over time
- The more you use it, the less you correct
- Knowledge never lost (audit trail)

### 4. Conservative Classification
- When unsure, mark as "needs review"
- Never silently miscategorize
- Confidence scores on everything
- Humans correct, system learns

### 5. Transparency Over Magic
- Show raw vendor alongside normalized
- Show why a category was chosen
- Show which rule matched
- No black boxes

### 6. Household-Friendly
- Comments for context ("birthday gift", "emergency repair")
- Simple enough for non-technical family members
- No jargon in the UI

---

## The Tests

Every feature must pass these tests:

### 1. The Answer Test
> Does this help answer "where did our money go?"

If it doesn't help answer spending questions, it doesn't belong.

### 2. The Compound Test
> Does using this feature make future use easier?

Features should accumulate value. Manual work should teach the system.

### 3. The Simplicity Test
> Can a non-technical family member understand this?

No finance jargon. No complex workflows. Show the data clearly.

### 4. The Privacy Test
> Does this keep all data under user control?

No external services that see transaction data. No analytics. No tracking.

### 5. The Drift Test

Is this becoming:
- A budgeting app? **Stop.**
- A bank integration? **Stop.**
- A financial advisor? **Stop.**
- An accounting system? **Stop.**

---

## Terminology

### Transaction States
| State | Meaning |
|-------|---------|
| **Imported** | Extracted from PDF, not yet reviewed |
| **Categorized** | Category assigned (auto or manual) |
| **Reviewed** | Human confirmed correctness |
| **Flagged** | Needs attention or discussion |

### Category Confidence
| Level | Action |
|-------|--------|
| **High** | Auto-categorized, no review needed |
| **Medium** | Auto-categorized, review recommended |
| **Low** | Marked as "needs review" |

### Transaction Types
| Type | Definition |
|------|------------|
| **Expense** | Money out |
| **Income** | Money in |
| **Transfer** | Internal movement between accounts (excluded from totals) |

### Vendor States
| State | Definition |
|-------|------------|
| **Known** | Has vendor rule, auto-categorizes |
| **New** | First time seen, needs classification |
| **Ambiguous** | Multiple possible categories |

---

## Signals Philosophy

Signals are **observations, not judgments**.

Good signal:
> "Dining out increased 40% over 3 months"

Bad signal:
> "You're spending too much on restaurants!"

We show patterns. Users interpret meaning.

### Signal Types (v1)
1. **Trend change** — Category up/down significantly
2. **Monthly outlier** — Unusual spend in category
3. **Large transaction** — Single item above threshold
4. **New subscription** — Recurring monthly charge detected
5. **New merchant** — Vendor not seen in 12 months

---

## User Interface Philosophy

### Less is more
- Home page shows current month
- Drill down only when needed
- No dashboards with 20 widgets

### Direct manipulation
- Click category to change it
- Changes save immediately
- No "edit mode" toggles

### Progressive disclosure
- Summary first
- Details on demand
- Raw data accessible but not prominent

---

## Technical Boundaries

### What lives in the database
- All transactions (normalized)
- All vendor rules
- All categories
- All comments
- Import job history
- Audit trail

### What lives in Edge Functions
- PDF parsing (requires Deno)
- LLM calls for classification fallback
- Complex vendor normalization

### What lives in the client
- Display logic
- Filtering/sorting
- Chart rendering

### What we don't build
- Mobile app (responsive web is enough)
- Notifications/alerts (check when you want)
- Recurring transaction predictions (just detect subscriptions)

---

## V2: MCP Integration

In V2, add conversational interface via MCP:

**Allowed queries:**
- "How much did we spend on groceries in December?"
- "What were our biggest expenses last month?"
- "Show me all Amazon transactions this year"
- "What subscriptions do we have?"

**Not allowed:**
- "Should I cancel Netflix?" (advice)
- "Set a budget for dining" (budgeting)
- "Transfer money to savings" (actions)

MCP is **read-only exploration**, not financial management.

---

## Success Criteria

After 3 months of use:

1. **All transactions categorized** — <5% in "uncategorized"
2. **Auto-classification rate >80%** — Vendor rules compound
3. **Monthly review <10 minutes** — Quick scan, few corrections
4. **Can answer questions** — "How much on X?" is instant
5. **Family uses it** — Comments appear, discussions happen

---

## What We Will Not Do

Even if requested:

1. **Bank API connections** — Security risk, maintenance burden
2. **Budget enforcement** — We observe, not judge
3. **Investment tracking** — Different problem, different app
4. **Receipt scanning** — PDF statements are source of truth
5. **Multi-currency complexity** — EUR only (for now)
6. **Shared access with non-family** — Private household tool

---

## Closing Principle

> This is a mirror for your spending, not a coach for your behavior.

Show the truth. Let humans decide what it means.
