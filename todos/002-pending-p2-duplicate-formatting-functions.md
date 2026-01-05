---
status: pending
priority: p2
issue_id: "002"
tags: [code-duplication, refactoring, code-quality, pr-10]
dependencies: []
---

# Duplicate Formatting Functions in transactions.tsx and import.tsx

## Problem Statement

**What's broken:** `transactions.tsx` and `import.tsx` contain local `formatCurrency()` and `formatDate()` functions that duplicate functionality already provided by the centralized `lib/format.ts` utility module created in PR #10.

**Why it matters:**
- **Inconsistency:** Different formatting logic across pages (transactions shows signed amounts `+ €1.234,56`, while lib/format.ts uses unsigned `€1.234,56`)
- **Maintenance burden:** Changes to formatting require updates in 3+ locations
- **Contradicts PR #10 goal:** PR #10 specifically created `lib/format.ts` to eliminate this exact problem
- **Code bloat:** 25+ lines of duplicate code

**Impact:**
- Not blocking (doesn't break functionality)
- Increases technical debt
- Violates DRY principle
- Makes future formatting changes error-prone

## Findings

### Location & Evidence

**File 1:** `web/src/pages/transactions.tsx` (Lines 8-23)
```typescript
function formatCurrency(amount: number): string {
  const euros = amount / 100
  const formatted = new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(Math.abs(euros))
  return euros >= 0 ? `+ ${formatted}` : `- ${formatted}`  // ← Signed format
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: 'short',
  })
}
```

**File 2:** `web/src/pages/import.tsx` (Lines 150-159)
```typescript
function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',      // ← Includes year
    hour: '2-digit',      // ← Includes time
    minute: '2-digit'
  })
}
```

**Centralized Version:** `web/src/lib/format.ts` (Created in PR #10)
```typescript
export function formatAmount(cents: number): string {
  const euros = cents / 100
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(euros)  // ← Unsigned format
}

export function formatDate(
  date: string | Date,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('de-DE', options || {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function toSignedAmount(amount: number, direction: 'debit' | 'credit'): number {
  return direction === 'debit' ? -amount : amount
}
```

### Why This Exists

From git history analysis:
- `transactions.tsx` and `import.tsx` predate `lib/format.ts`
- These files were created in earlier phases (Phase 3-4)
- `lib/format.ts` was added in PR #10 (Phase 6)
- **PR #10 failed to refactor existing code** to use the new utilities

From pattern-recognition-specialist agent:
> "VIOLATION: These duplicate functions exist when `lib/format.ts` already provides centralized formatting utilities. This was missed during PR #10 implementation."

## Proposed Solutions

### Solution 1: Replace with lib/format.ts Functions (RECOMMENDED)

**Approach:**
Remove local functions and import from centralized module.

**Implementation:**

**For transactions.tsx:**
```typescript
// REMOVE lines 8-23 (local formatCurrency and formatDate)

// ADD import:
import { formatAmount, formatDate, toSignedAmount } from '@/lib/format'

// REPLACE usage (Lines ~200-250):
// OLD:
formatCurrency(transaction.amount)

// NEW:
const signedAmount = toSignedAmount(transaction.amount, transaction.direction)
formatAmount(signedAmount)
```

**For import.tsx:**
```typescript
// REMOVE lines 150-159 (local formatDate)

// ADD import:
import { formatDate } from '@/lib/format'

// UPDATE usage (Lines ~400-450):
// OLD:
formatDate(import.created_at)

// NEW:
formatDate(import.created_at, {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
})
```

**Pros:**
- Eliminates all duplication
- Uses centralized, tested utilities
- Future formatting changes only require one update
- Consistent formatting across all pages
- Aligns with PR #10 intent

**Cons:**
- None

**Effort:** 15 minutes

**Risk:** VERY LOW (direct replacement, same output)

### Solution 2: Keep Local Functions, Add Comment

**Approach:**
Document why local functions exist instead of removing them.

**Implementation:**
```typescript
// Note: Local formatCurrency() used for signed display (+ / -)
// Consider migrating to lib/format.ts toSignedAmount() + formatAmount()
function formatCurrency(amount: number): string { ... }
```

**Pros:**
- Zero code changes
- Documents decision

**Cons:**
- Duplication remains
- Technical debt persists
- Contradicts PR #10 goal
- Maintenance burden continues

**Effort:** 2 minutes

**Risk:** NONE (no changes)

**Verdict:** NOT RECOMMENDED (doesn't solve the problem)

### Solution 3: Enhance lib/format.ts with Signed Formatting

**Approach:**
Add a `formatSignedAmount()` function to lib/format.ts specifically for signed display.

**Implementation:**
```typescript
// In lib/format.ts, add:
export function formatSignedAmount(
  cents: number,
  direction: 'debit' | 'credit',
  options?: { showPlus?: boolean }
): string {
  const signed = toSignedAmount(cents, direction)
  const formatted = formatAmount(Math.abs(signed))
  if (options?.showPlus) {
    return signed >= 0 ? `+ ${formatted}` : `- ${formatted}`
  }
  return formatAmount(signed)
}

// In transactions.tsx, use:
formatSignedAmount(transaction.amount, transaction.direction, { showPlus: true })
```

**Pros:**
- Centralizes signed formatting logic
- More reusable than local functions
- Explicit options for display preferences

**Cons:**
- Adds complexity to lib/format.ts
- Over-engineering for a simple use case
- Not needed if transactions.tsx can use existing utilities

**Effort:** 30 minutes

**Risk:** LOW (new function, doesn't break existing code)

**Verdict:** OVER-ENGINEERING (Solution 1 is simpler)

## Recommended Action

**Use Solution 1: Replace with lib/format.ts**

**Steps:**
1. Checkout PR #10 branch (or create follow-up PR)
2. **Update transactions.tsx:**
   - Remove lines 8-23 (formatCurrency, formatDate)
   - Add import: `import { formatAmount, formatDate, toSignedAmount } from '@/lib/format'`
   - Find all `formatCurrency(amount)` calls, replace with:
     ```typescript
     const signedAmount = toSignedAmount(amount, direction)
     formatAmount(signedAmount)
     ```
   - Find all `formatDate(date)` calls, verify they work with lib version
3. **Update import.tsx:**
   - Remove lines 150-159 (formatDate)
   - Add import: `import { formatDate } from '@/lib/format'`
   - Update calls to pass custom options if needed
4. Run linting: `npm run lint`
5. Test both pages manually (transactions list, import history)
6. Commit: `refactor: use centralized formatting utilities`

**Why this solution:**
- Simplest, most direct
- Aligns with PR #10 architecture
- Eliminates duplication immediately
- Pattern-recognition agent confirmed this approach

## Technical Details

**Affected Files:**
- `web/src/pages/transactions.tsx` (remove lines 8-23, update usage)
- `web/src/pages/import.tsx` (remove lines 150-159, update usage)
- `web/src/lib/format.ts` (no changes, just use existing functions)

**Usage Count:**
- `formatCurrency`: ~3-5 calls in transactions.tsx
- `formatDate` in transactions.tsx: ~2-3 calls
- `formatDate` in import.tsx: ~5-7 calls

**LOC Reduction:** ~25 lines removed

**Frontend Impact:**
- Visual output may change slightly (signed format)
- Test manually to verify no UX regression

## Acceptance Criteria

- [ ] No `formatCurrency()` or `formatDate()` functions defined in transactions.tsx
- [ ] No `formatDate()` function defined in import.tsx
- [ ] All imports from `lib/format.ts` present
- [ ] Transactions page displays amounts with correct sign (+ income, - expense)
- [ ] Import history page displays timestamps with year and time
- [ ] Linting passes: `npm run lint` shows 0 new errors
- [ ] Manual testing:
  - [ ] Navigate to /transactions → amounts formatted correctly
  - [ ] Navigate to /import → timestamps formatted correctly
  - [ ] No console errors in browser
- [ ] Git diff shows ~25 lines removed, ~5 lines added (net reduction)

## Work Log

### 2026-01-05 - Issue Created from Code Review

**By:** Claude Code (pattern-recognition-specialist agent)

**Actions:**
- Analyzed PR #10 for code duplication
- Identified duplicate formatting in transactions.tsx and import.tsx
- Compared with lib/format.ts created in same PR
- Traced historical context via git log

**Findings:**
- 25+ lines of duplicate code across 2 files
- Formatting logic differs slightly between duplicates
- lib/format.ts exists but isn't being used
- PR #10 focused on home.tsx, missed existing pages

**Priority Justification:**
- P2 (IMPORTANT) because:
  - Impacts code quality and maintainability
  - Not blocking (functionality works)
  - Simple 15-minute fix
  - Should be included in PR #10 or immediate follow-up

## Resources

- **PR #10:** https://github.com/DennisKallerhoff/personal-finance/pull/10
- **Pattern Analysis:** Code review by pattern-recognition-specialist agent
- **lib/format.ts:** `web/src/lib/format.ts` (created in PR #10)
- **transactions.tsx:** Lines 8-23 (duplication)
- **import.tsx:** Lines 150-159 (duplication)

## Notes

- **Low Risk:** Direct replacement, same output
- **Quick Win:** 15 minutes to eliminate 25 lines of duplication
- **Aligns with PR #10 Goals:** PR #10 specifically created lib/format.ts for this purpose
- **Follow-Up Opportunity:** Could be fixed in PR #10 or separate refactor PR
