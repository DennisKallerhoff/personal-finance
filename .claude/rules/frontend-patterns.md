# Frontend Patterns

Rules for React + TypeScript development in Haushaltsbuch.
Prevents common mistakes and enforces consistency.

---

## Stack

| Layer | Technology |
|-------|------------|
| Framework | React 18+ with Vite |
| Language | TypeScript (strict mode) |
| Styling | TailwindCSS |
| Components | shadcn/ui |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| Routing | React Router |

---

## State Management

### Use Supabase Client Directly

```typescript
// Good: Direct Supabase calls
const [transactions, setTransactions] = useState<Transaction[]>([])
const [loading, setLoading] = useState(true)

useEffect(() => {
  const fetch = async () => {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('date', { ascending: false })

    if (data) setTransactions(data)
    setLoading(false)
  }
  fetch()
}, [])

// Bad: TanStack Query wrapper (unnecessary complexity)
const { data } = useQuery(['transactions'], fetchTransactions)
```

### No Global State Libraries

- No Redux, Zustand, or Jotai
- Use React Context only for auth state
- Prop drilling is fine for 2-3 levels
- Lift state to common ancestor when needed

---

## Common React Errors to Avoid

### 1. Missing Dependency Arrays

```typescript
// Bad: Runs on every render
useEffect(() => {
  fetchData()
})

// Bad: Missing dependency
useEffect(() => {
  fetchData(categoryId)
}, []) // categoryId missing!

// Good: Complete dependencies
useEffect(() => {
  fetchData(categoryId)
}, [categoryId])
```

### 2. Object/Array Dependencies That Always Change

```typescript
// Bad: New object every render = infinite loop
useEffect(() => {
  fetchWithFilters(filters)
}, [{ category: 'food', month: 'january' }]) // New object each time!

// Good: Primitive dependencies or useMemo
const filterKey = `${category}-${month}`
useEffect(() => {
  fetchWithFilters({ category, month })
}, [filterKey])
```

### 3. State Updates on Unmounted Components

```typescript
// Bad: No cleanup, causes memory leak warning
useEffect(() => {
  fetchData().then(data => setData(data))
}, [])

// Good: Abort controller or mounted flag
useEffect(() => {
  let mounted = true
  fetchData().then(data => {
    if (mounted) setData(data)
  })
  return () => { mounted = false }
}, [])
```

### 4. Mutating State Directly

```typescript
// Bad: Mutates existing array
const addTransaction = (tx: Transaction) => {
  transactions.push(tx) // Mutation!
  setTransactions(transactions)
}

// Good: New array reference
const addTransaction = (tx: Transaction) => {
  setTransactions(prev => [...prev, tx])
}
```

### 5. Stale Closures in Event Handlers

```typescript
// Bad: count is stale
const [count, setCount] = useState(0)
const handleClick = () => {
  setTimeout(() => {
    setCount(count + 1) // Uses stale count!
  }, 1000)
}

// Good: Functional update
const handleClick = () => {
  setTimeout(() => {
    setCount(prev => prev + 1)
  }, 1000)
}
```

### 6. Unnecessary Re-renders from Inline Functions

```typescript
// Bad: New function every render
<TransactionRow
  onEdit={() => handleEdit(tx.id)}
/>

// Good: useCallback or pass ID
const handleEdit = useCallback((id: string) => {
  // edit logic
}, [])

<TransactionRow
  onEdit={handleEdit}
  transactionId={tx.id}
/>
```

### 7. Key Prop Anti-patterns

```typescript
// Bad: Index as key (breaks on reorder/delete)
{transactions.map((tx, i) => (
  <TransactionRow key={i} transaction={tx} />
))}

// Bad: Random key (remounts every render)
{transactions.map(tx => (
  <TransactionRow key={Math.random()} transaction={tx} />
))}

// Good: Stable unique ID
{transactions.map(tx => (
  <TransactionRow key={tx.id} transaction={tx} />
))}
```

### 8. Async in useEffect Without Wrapper

```typescript
// Bad: useEffect can't be async directly
useEffect(async () => {
  const data = await fetchData()
  setData(data)
}, [])

// Good: Inner async function
useEffect(() => {
  const fetch = async () => {
    const data = await fetchData()
    setData(data)
  }
  fetch()
}, [])
```

---

## Component Patterns

### File Structure

```
components/
├── ui/                    # shadcn/ui components (owned, editable)
│   ├── button.tsx
│   └── card.tsx
├── transaction-row.tsx    # Domain components
├── category-picker.tsx
└── amount-display.tsx

pages/
├── home.tsx
├── transactions.tsx
├── import.tsx
└── settings.tsx
```

### Component Naming

```typescript
// Good: PascalCase, descriptive
TransactionRow.tsx
CategoryPicker.tsx
MonthSelector.tsx

// Bad: Generic or unclear
Row.tsx
Picker.tsx
Component1.tsx
```

### Props Interface Pattern

```typescript
// Define props explicitly
interface TransactionRowProps {
  transaction: Transaction
  onCategoryChange: (categoryId: string) => void
  isSelected?: boolean
}

export function TransactionRow({
  transaction,
  onCategoryChange,
  isSelected = false
}: TransactionRowProps) {
  // ...
}
```

---

## Forms with React Hook Form + Zod

### Schema First

```typescript
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

// Define schema
const categorySchema = z.object({
  name: z.string().min(1, 'Name required').max(50),
  parentId: z.string().uuid().optional(),
  icon: z.string().optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional()
})

type CategoryForm = z.infer<typeof categorySchema>

// Use in component
const form = useForm<CategoryForm>({
  resolver: zodResolver(categorySchema),
  defaultValues: { name: '', icon: '', color: '#000000' }
})
```

### Error Display

```typescript
// Inline errors, no toasts for validation
<input {...form.register('name')} />
{form.formState.errors.name && (
  <span className="text-sm text-red-500">
    {form.formState.errors.name.message}
  </span>
)}
```

---

## Styling with TailwindCSS

### Prefer Utility Classes

```typescript
// Good: Tailwind utilities
<div className="flex items-center gap-2 p-4 bg-white rounded-lg shadow">

// Bad: Custom CSS file
<div className={styles.transactionCard}>
```

### Conditional Classes with clsx

```typescript
import { clsx } from 'clsx'

<div className={clsx(
  'p-4 rounded-lg',
  isSelected && 'bg-blue-50 border-blue-500',
  isExpense ? 'text-red-600' : 'text-green-600'
)}>
```

### shadcn/ui Customization

```typescript
// Extend variants, don't override base
<Button variant="destructive" size="sm">
  Delete
</Button>

// For custom needs, copy and modify the component in ui/
```

---

## Data Display

### German Locale for Numbers

```typescript
// Good: German format
const formatAmount = (cents: number): string => {
  const euros = cents / 100
  return euros.toLocaleString('de-DE', {
    style: 'currency',
    currency: 'EUR'
  })
}
// 1234.56 → "1.234,56 €"

// Bad: US format
amount.toLocaleString('en-US')
```

### Date Formatting

```typescript
// Good: German date format
const formatDate = (date: Date): string => {
  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}
// → "01.12.2024"
```

### Amount Component

```typescript
// Reusable amount display with color
interface AmountProps {
  cents: number
  showSign?: boolean
}

export function Amount({ cents, showSign = false }: AmountProps) {
  const isNegative = cents < 0
  const formatted = formatAmount(Math.abs(cents))

  return (
    <span className={isNegative ? 'text-red-600' : 'text-green-600'}>
      {showSign && (isNegative ? '-' : '+')}
      {formatted}
    </span>
  )
}
```

---

## Charts with Recharts

### Standard Configuration

```typescript
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip
} from 'recharts'

// Always wrap in ResponsiveContainer
<ResponsiveContainer width="100%" height={300}>
  <BarChart data={monthlyData}>
    <XAxis
      dataKey="month"
      tickFormatter={(m) => formatMonth(m, 'de-DE')}
    />
    <YAxis
      tickFormatter={(v) => formatCompactAmount(v)}
    />
    <Tooltip
      formatter={(value) => formatAmount(value as number)}
    />
    <Bar dataKey="total" fill="#3b82f6" />
  </BarChart>
</ResponsiveContainer>
```

---

## Loading and Error States

### Consistent Pattern

```typescript
function TransactionList() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data, error } = await supabase
          .from('transactions')
          .select('*')

        if (error) throw error
        setTransactions(data || [])
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [])

  if (loading) return <div>Laden...</div>
  if (error) return <div className="text-red-500">{error}</div>
  if (transactions.length === 0) return <div>Keine Transaktionen</div>

  return <ul>{/* render transactions */}</ul>
}
```

---

## What We Don't Do

| Anti-pattern | Why |
|--------------|-----|
| TanStack Query | Supabase client is sufficient |
| Redux/Zustand | App state is simple |
| CSS Modules | TailwindCSS handles styling |
| Barrel exports | Direct imports are clearer |
| Container/Presentational split | Outdated pattern |
| HOCs for logic sharing | Use hooks instead |
| PropTypes | TypeScript handles this |
