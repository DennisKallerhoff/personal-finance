# Coding Laws

These laws override generic best practices.
Follow them even if they conflict with common conventions.

Haushaltsbuch is a personal finance consolidation tool.
Simplicity, privacy, and compounding knowledge matter most.

---

## Core Development Laws

### 1. Simplicity over abstraction

- Prefer explicit, readable code over clever or generic solutions.
- Do NOT introduce abstractions unless they clearly reduce cognitive load.
- Duplicate simple logic rather than abstracting early.

### 2. Postgres is the system of truth

- All business logic must be explainable via stored data.
- Transactions, rules, and categories live in the database.
- If it's not in a table, it doesn't exist.

### 3. Functions before frameworks

- Prefer small, pure functions with explicit inputs and outputs.
- Avoid shared mutable state.
- Avoid framework-specific magic when plain code suffices.

### 4. Data shapes are contracts

- Tables, views, and JSON schemas are stable APIs.
- Any change to a data shape is a breaking change and must be explicit.

### 5. No premature generalization

- Do not "future-proof" without instruction.
- Optimize for today's clarity, not hypothetical reuse.
- Build for ING + 1 credit card first. Generalize later if needed.

### 6. Conservative classification

- When classification confidence is low, mark for review.
- Never silently miscategorize — false positives erode trust.
- Prefer "needs review" over wrong category.

### 7. Compound knowledge

- Every manual correction should create or update a rule.
- The system should get smarter over time.
- Audit trail for all changes.

### 8. Ask when unsure

- If requirements are ambiguous or incomplete, ask before coding.

---

## Supabase-Specific Laws

### 9. Postgres + RLS for security

- Postgres is authoritative.
- All data must be protected by Row Level Security.
- Access rules live in SQL, not application code.
- For single-household: RLS can be simple (authenticated = access).

### 10. Data before code

- Prefer tables, views, and SQL logic over application logic.
- Category trees, vendor rules, signals — close to the data.

### 11. Edge Functions have specific purposes

Use Edge Functions only for:
- PDF parsing (requires Deno runtime)
- LLM calls for classification fallback
- Complex text normalization

Do NOT move deterministic business logic out of the database.

### 12. Schema discipline is mandatory

- All schema changes require migrations.
- Migrations must be reversible.
- Naming must be consistent and explicit.

---

## PDF Parsing Laws

### 13. Template-specific parsing

- Each bank/card gets its own parser module.
- Don't try to build a "universal" PDF parser.
- ING parser, Credit Card parser — separate files.

### 14. Graceful degradation

- Partial extraction is better than total failure.
- Mark unparseable transactions as `needs_review`.
- Log warnings, don't throw errors for recoverable issues.

### 15. German number handling

- Always expect: `1.234,56` format (dot = thousands, comma = decimal).
- Convert to cents for storage (integer math).
- Display in locale-appropriate format.

---

## Testing Laws

### 16. Testing follows the code structure

- Pure functions get unit tests.
- Edge functions get contract tests (mock external APIs).
- Database logic gets pgTAP tests.
- PDF parsers get snapshot tests with real samples.

### 17. Dependency injection for testability

```typescript
// Good: Dependencies injected
export async function classifyTransaction(input: Transaction, deps: Dependencies) {
  const { supabase, llm, log } = deps
  // Pure logic here
}

// Bad: Dependencies imported directly
import { supabase } from './client'
export async function classifyTransaction(input: Transaction) {
  // Untestable
}
```

---

## Error Handling Laws

### 18. Error taxonomy is explicit

Two error types only:

```typescript
// User can fix this (4xx)
class BadInputError extends Error {
  status = 400
}

// System issue, retry or escalate (5xx)
class UpstreamFailError extends Error {
  status = 500
}
```

### 19. Structured logging

```typescript
log.info("transaction_classified", {
  op: "classify",
  vendor: "Amazon",
  category: "Shopping",
  confidence: "high",
  rule_id: "rule_123"
})
```

Never log PII (full names, addresses) — vendor names are OK.

---

## Interpretation

These laws intentionally favor:
- clarity over elegance
- data over abstraction
- privacy over convenience
- compounding over one-time

Violations of these laws are considered bugs.
