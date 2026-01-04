import { useState, useEffect } from 'react'
import { X, MessageSquare, Info } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { supabase, type Transaction as DbTransaction, type Category, type Account } from '@/lib/supabase'

function formatCurrency(amount: number): string {
  const euros = amount / 100
  const formatted = new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(Math.abs(euros))
  return euros >= 0 ? `+ ${formatted}` : `- ${formatted}`
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: 'short',
  })
}

interface TransactionWithDetails extends DbTransaction {
  categories?: { name: string; color: string | null } | null
  accounts?: { name: string } | null
}

interface DrawerProps {
  transaction: TransactionWithDetails | null
  categories: Category[]
  onClose: () => void
  onCategoryChange: (transactionId: string, categoryId: string) => void
}

function TransactionDrawer({ transaction, categories, onClose, onCategoryChange }: DrawerProps) {
  if (!transaction) return null

  // Convert to signed amount for display
  const signedAmount = transaction.direction === 'debit' ? -transaction.amount : transaction.amount

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-secondary/60 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed top-0 right-0 w-[600px] h-full bg-white shadow-2xl z-50 overflow-y-auto border-l border-border animate-in slide-in-from-right duration-300">
        <div className="p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Transaction Details</h2>
            <Button variant="outline" size="sm" onClick={onClose}>
              <X size={16} className="mr-1" />
              Close
            </Button>
          </div>

          {/* Transaction Info */}
          <div className="bg-muted rounded-xl p-6 mb-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Vendor
                </label>
                <div className="font-heading text-2xl font-bold mt-1">
                  {transaction.normalized_vendor || transaction.raw_vendor || 'Unknown'}
                </div>
              </div>
              <div className="text-right">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Amount
                </label>
                <div className={`font-heading text-2xl font-bold mt-1 ${signedAmount >= 0 ? 'text-[var(--success)]' : ''}`}>
                  {formatCurrency(signedAmount)}
                </div>
              </div>
            </div>

            <div className="mt-6">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Raw Description
              </label>
              <div className="font-mono bg-white p-3 rounded-lg border border-border mt-1 text-sm">
                {transaction.raw_vendor || '-'}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 mt-6">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Date
                </label>
                <div className="font-medium mt-1">{transaction.date}</div>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Account
                </label>
                <div className="font-medium mt-1">{transaction.accounts?.name || '-'}</div>
              </div>
            </div>
          </div>

          {/* Categorization */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
                Categorization
              </h3>
              <div className="mb-4">
                <label className="font-semibold block mb-2">Category</label>
                <select
                  value={transaction.category_id || ''}
                  onChange={(e) => onCategoryChange(transaction.id, e.target.value)}
                  className="w-full p-3 border-2 border-border rounded-lg bg-[#fafafa] focus:border-primary focus:bg-white outline-none"
                >
                  <option value="">Uncategorized</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-6 mt-6">
                <label className="flex items-center gap-2 cursor-pointer font-medium">
                  <input
                    type="checkbox"
                    checked={transaction.is_transfer}
                    readOnly
                    className="accent-primary w-4 h-4"
                  />
                  Transfer
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-medium">
                  <input
                    type="checkbox"
                    checked={transaction.is_reviewed}
                    readOnly
                    className="accent-primary w-4 h-4"
                  />
                  Reviewed
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Description */}
          {transaction.description && (
            <Card>
              <CardContent className="p-6">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
                  Description
                </h3>
                <div className="font-medium">{transaction.description}</div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  )
}

export default function Transactions() {
  const [transactions, setTransactions] = useState<TransactionWithDetails[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionWithDetails | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [selectedAccount, setSelectedAccount] = useState<string>('')
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })

  // Fetch categories and accounts on mount
  useEffect(() => {
    const fetchMetadata = async () => {
      const [{ data: cats }, { data: accs }] = await Promise.all([
        supabase.from('categories').select('*').order('sort_order'),
        supabase.from('accounts').select('*').eq('is_active', true).order('name'),
      ])
      if (cats) setCategories(cats)
      if (accs) setAccounts(accs)
    }
    fetchMetadata()
  }, [])

  // Fetch transactions when filters change
  useEffect(() => {
    const fetchTransactions = async () => {
      setLoading(true)

      // Parse selected month
      const [year, month] = selectedMonth.split('-').map(Number)
      const startDate = new Date(year, month - 1, 1)
      const endDate = new Date(year, month, 0) // Last day of month

      let query = supabase
        .from('transactions')
        .select('*, categories(name, color), accounts(name)')
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])
        .order('date', { ascending: false })
        .limit(200)

      if (selectedCategory) {
        query = query.eq('category_id', selectedCategory)
      }

      if (selectedAccount) {
        query = query.eq('account_id', selectedAccount)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching transactions:', error)
      } else {
        setTransactions(data as TransactionWithDetails[] || [])
      }

      setLoading(false)
    }

    fetchTransactions()
  }, [selectedMonth, selectedCategory, selectedAccount])

  // Handle category change
  const handleCategoryChange = async (transactionId: string, categoryId: string) => {
    const { error } = await supabase
      .from('transactions')
      .update({ category_id: categoryId || null, is_reviewed: true })
      .eq('id', transactionId)

    if (!error) {
      // Update local state
      setTransactions(prev =>
        prev.map(t =>
          t.id === transactionId
            ? { ...t, category_id: categoryId || null, is_reviewed: true }
            : t
        )
      )
      // Update selected transaction if open
      if (selectedTransaction?.id === transactionId) {
        setSelectedTransaction(prev =>
          prev ? { ...prev, category_id: categoryId || null, is_reviewed: true } : null
        )
      }
    }
  }

  // Filter by search query
  const filteredTransactions = transactions.filter(t => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      t.raw_vendor?.toLowerCase().includes(query) ||
      t.normalized_vendor?.toLowerCase().includes(query) ||
      t.description?.toLowerCase().includes(query)
    )
  })

  // Calculate total (expenses only)
  const totalExpenses = filteredTransactions
    .filter(t => t.direction === 'debit' && !t.is_transfer)
    .reduce((sum, t) => sum + t.amount, 0)

  return (
    <div>
      <Card className="overflow-hidden border-2 border-border">
        {/* Filter Bar */}
        <div className="bg-white p-4 border-b-2 border-border flex items-center gap-4 flex-wrap">
          <Input
            type="text"
            placeholder="Search transactions..."
            className="w-60"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border-2 border-border rounded-lg bg-[#fafafa] focus:border-primary focus:bg-white outline-none w-40"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          <select
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
            className="px-3 py-2 border-2 border-border rounded-lg bg-[#fafafa] focus:border-primary focus:bg-white outline-none w-40"
          >
            <option value="">All Accounts</option>
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>{acc.name}</option>
            ))}
          </select>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2 border-2 border-border rounded-lg bg-[#fafafa] focus:border-primary focus:bg-white outline-none"
          />
        </div>

        {/* Summary Row */}
        <div className="px-4 py-3 bg-muted border-b-2 border-border flex justify-between font-heading font-bold text-muted-foreground">
          <span>Showing {filteredTransactions.length} transactions</span>
          <span>Total Expenses: {formatCurrency(-totalExpenses)}</span>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">
            Loading transactions...
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No transactions found for this period.
          </div>
        ) : (
          /* Transactions Table */
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground p-4 border-b-2 border-border w-[100px]">
                  Date
                </th>
                <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground p-4 border-b-2 border-border">
                  Vendor
                </th>
                <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground p-4 border-b-2 border-border">
                  Description
                </th>
                <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground p-4 border-b-2 border-border w-[160px]">
                  Category
                </th>
                <th className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground p-4 border-b-2 border-border w-[120px]">
                  Amount
                </th>
                <th className="w-[60px] border-b-2 border-border" />
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((transaction) => {
                const signedAmount = transaction.direction === 'debit' ? -transaction.amount : transaction.amount
                return (
                  <tr
                    key={transaction.id}
                    onClick={() => setSelectedTransaction(transaction)}
                    className={`cursor-pointer transition-colors hover:bg-[#f3f4f6] ${
                      transaction.direction === 'credit' ? 'bg-[var(--success-light)]' : ''
                    } ${transaction.is_transfer ? 'opacity-50' : ''}`}
                  >
                    <td className="p-4 border-b border-border font-heading font-medium">
                      {formatDate(transaction.date)}
                    </td>
                    <td className="p-4 border-b border-border">
                      <span className="font-semibold">
                        {transaction.normalized_vendor || transaction.raw_vendor?.substring(0, 20) || 'Unknown'}
                      </span>
                      {transaction.raw_vendor && (
                        <span
                          title={transaction.raw_vendor}
                          className="text-muted-foreground ml-2 cursor-help"
                        >
                          <Info size={14} className="inline" />
                        </span>
                      )}
                    </td>
                    <td className="p-4 border-b border-border text-muted-foreground text-sm">
                      {transaction.description || '-'}
                    </td>
                    <td className="p-4 border-b border-border">
                      <select
                        value={transaction.category_id || ''}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => handleCategoryChange(transaction.id, e.target.value)}
                        className="px-2 py-1 border border-border rounded text-sm bg-white w-full"
                      >
                        <option value="">-</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className={`p-4 border-b border-border text-right font-heading font-semibold ${
                      signedAmount >= 0 ? 'text-[var(--success)]' : ''
                    }`}>
                      {formatCurrency(signedAmount)}
                    </td>
                    <td className="p-4 border-b border-border text-right" onClick={(e) => e.stopPropagation()}>
                      {!transaction.is_reviewed && (
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                          New
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </Card>

      {/* Transaction Detail Drawer */}
      <TransactionDrawer
        transaction={selectedTransaction}
        categories={categories}
        onClose={() => setSelectedTransaction(null)}
        onCategoryChange={handleCategoryChange}
      />
    </div>
  )
}
