import { useState, useEffect } from 'react'
import { X, Info, ChevronLeft, ChevronRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { supabase, type Transaction as DbTransaction, type Category, type Account, type Comment } from '@/lib/supabase'

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
  is_flagged?: boolean
}

interface DrawerProps {
  transaction: TransactionWithDetails | null
  categories: Category[]
  onClose: () => void
  onCategoryChange: (transactionId: string, categoryId: string) => void
  onToggle: (field: 'is_transfer' | 'is_reviewed' | 'is_flagged', value: boolean) => void
}

function TransactionDrawer({ transaction, categories, onClose, onCategoryChange, onToggle }: DrawerProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [loadingComments, setLoadingComments] = useState(false)

  // Fetch comments when drawer opens
  useEffect(() => {
    if (!transaction) {
      setComments([])
      return
    }

    const fetchComments = async () => {
      setLoadingComments(true)
      const { data } = await supabase
        .from('comments')
        .select('*')
        .eq('transaction_id', transaction.id)
        .order('created_at', { ascending: true })

      if (data) setComments(data)
      setLoadingComments(false)
    }

    fetchComments()
  }, [transaction?.id])

  const handleAddComment = async () => {
    if (!transaction || !newComment.trim()) return

    const { data } = await supabase
      .from('comments')
      .insert({
        transaction_id: transaction.id,
        text: newComment.trim()
      })
      .select()
      .single()

    if (data) {
      setComments(prev => [...prev, data])
      setNewComment('')
    }
  }

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
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
                Quick Actions
              </h3>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={transaction.is_transfer ? "default" : "outline"}
                  size="sm"
                  onClick={() => onToggle('is_transfer', !transaction.is_transfer)}
                >
                  {transaction.is_transfer ? '↔️ Transfer' : '↔️ Mark as Transfer'}
                </Button>

                <Button
                  variant={transaction.is_reviewed ? "default" : "outline"}
                  size="sm"
                  onClick={() => onToggle('is_reviewed', !transaction.is_reviewed)}
                >
                  {transaction.is_reviewed ? '✓ Reviewed' : '○ Mark Reviewed'}
                </Button>

                <Button
                  variant={transaction.is_flagged ? "destructive" : "outline"}
                  size="sm"
                  onClick={() => onToggle('is_flagged', !transaction.is_flagged)}
                >
                  {transaction.is_flagged ? '🚩 Flagged' : '⚑ Flag'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Comments */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
                Comments
              </h3>

              {/* Comment List */}
              <div className="space-y-3 mb-4 max-h-48 overflow-y-auto">
                {loadingComments ? (
                  <p className="text-sm text-muted-foreground">Loading comments...</p>
                ) : comments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No comments yet.</p>
                ) : (
                  comments.map(comment => (
                    <div key={comment.id} className="bg-muted/50 rounded p-3">
                      <p className="text-sm">{comment.text}</p>
                      {comment.created_at && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(comment.created_at).toLocaleDateString('de-DE')}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Add Comment */}
              <div className="flex gap-2">
                <Input
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                />
                <Button
                  size="sm"
                  onClick={handleAddComment}
                  disabled={!newComment.trim()}
                >
                  Add
                </Button>
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
  const [selectedDateRange, setSelectedDateRange] = useState<string>('last30')
  const [updateError, setUpdateError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const PAGE_SIZE = 50

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

  // Generate year options (current year back to 2020)
  const currentYear = new Date().getFullYear()
  const yearOptions = Array.from({ length: currentYear - 2019 }, (_, i) => currentYear - i)

  // Calculate date range from selection
  const getDateRange = (range: string): { startDate: string; endDate: string } => {
    const today = new Date()
    const endDate = today.toISOString().split('T')[0]

    if (range.startsWith('last')) {
      const days = parseInt(range.replace('last', ''))
      const start = new Date(today)
      start.setDate(start.getDate() - days)
      return { startDate: start.toISOString().split('T')[0], endDate }
    }

    // Year selection (e.g., "2024")
    const year = parseInt(range)
    if (!isNaN(year)) {
      return {
        startDate: `${year}-01-01`,
        endDate: `${year}-12-31`
      }
    }

    // Fallback to last 30 days
    const start = new Date(today)
    start.setDate(start.getDate() - 30)
    return { startDate: start.toISOString().split('T')[0], endDate }
  }

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [selectedDateRange, selectedCategory, selectedAccount])

  // Fetch transactions when filters or page change
  useEffect(() => {
    const fetchTransactions = async () => {
      setLoading(true)

      const { startDate, endDate } = getDateRange(selectedDateRange)

      // Build base query for count
      let countQuery = supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .gte('date', startDate)
        .lte('date', endDate)

      if (selectedCategory) {
        countQuery = countQuery.eq('category_id', selectedCategory)
      }
      if (selectedAccount) {
        countQuery = countQuery.eq('account_id', selectedAccount)
      }

      const { count } = await countQuery
      setTotalCount(count || 0)

      // Build query for data with pagination
      const from = (currentPage - 1) * PAGE_SIZE
      const to = from + PAGE_SIZE - 1

      let query = supabase
        .from('transactions')
        .select('*, categories(name, color), accounts(name)')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false })
        .range(from, to)

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
  }, [selectedDateRange, selectedCategory, selectedAccount, currentPage])

  // Handle category change using RPC for audit trail
  const handleCategoryChange = async (transactionId: string, categoryId: string) => {
    setUpdateError(null)

    // Optimistic update
    setTransactions(prev =>
      prev.map(t =>
        t.id === transactionId
          ? { ...t, category_id: categoryId || null, is_reviewed: true }
          : t
      )
    )
    if (selectedTransaction?.id === transactionId) {
      setSelectedTransaction(prev =>
        prev ? { ...prev, category_id: categoryId || null, is_reviewed: true } : null
      )
    }

    // @ts-expect-error - RPC function not yet in generated types
    const { error } = await supabase.rpc('change_transaction_category', {
      p_transaction_id: transactionId,
      p_new_category_id: categoryId || null
    })

    if (error) {
      setUpdateError('Failed to update category. Please try again.')
      // Rollback on error
      const { startDate, endDate } = getDateRange(selectedDateRange)
      const from = (currentPage - 1) * PAGE_SIZE
      const to = from + PAGE_SIZE - 1
      let query = supabase
        .from('transactions')
        .select('*, categories(name, color), accounts(name)')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false })
        .range(from, to)
      if (selectedCategory) query = query.eq('category_id', selectedCategory)
      if (selectedAccount) query = query.eq('account_id', selectedAccount)
      const { data } = await query
      if (data) setTransactions(data as TransactionWithDetails[])

      // Auto-clear error after 5 seconds
      setTimeout(() => setUpdateError(null), 5000)
    }
  }

  // Handle quick action toggles
  const handleToggle = async (field: 'is_transfer' | 'is_reviewed' | 'is_flagged', value: boolean) => {
    if (!selectedTransaction) return

    // Optimistic update
    setSelectedTransaction(prev => prev ? { ...prev, [field]: value } : null)
    setTransactions(prev =>
      prev.map(t =>
        t.id === selectedTransaction.id ? { ...t, [field]: value } : t
      )
    )

    const { error } = await supabase
      .from('transactions')
      .update({ [field]: value })
      .eq('id', selectedTransaction.id)

    if (error) {
      // Rollback on error
      const { startDate, endDate } = getDateRange(selectedDateRange)
      const from = (currentPage - 1) * PAGE_SIZE
      const to = from + PAGE_SIZE - 1
      let query = supabase
        .from('transactions')
        .select('*, categories(name, color), accounts(name)')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false })
        .range(from, to)
      if (selectedCategory) query = query.eq('category_id', selectedCategory)
      if (selectedAccount) query = query.eq('account_id', selectedAccount)
      const { data } = await query
      if (data) setTransactions(data as TransactionWithDetails[])
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
          <select
            value={selectedDateRange}
            onChange={(e) => setSelectedDateRange(e.target.value)}
            className="px-3 py-2 border-2 border-border rounded-lg bg-[#fafafa] focus:border-primary focus:bg-white outline-none w-44"
          >
            <optgroup label="Recent">
              <option value="last30">Last 30 days</option>
              <option value="last90">Last 90 days</option>
              <option value="last180">Last 180 days</option>
              <option value="last365">Last 12 months</option>
            </optgroup>
            <optgroup label="By Year">
              {yearOptions.map((year) => (
                <option key={year} value={year.toString()}>{year}</option>
              ))}
            </optgroup>
          </select>
        </div>

        {/* Error Message */}
        {updateError && (
          <div className="px-4 py-3 bg-[var(--destructive-light)] border-b-2 border-destructive text-destructive font-medium">
            {updateError}
          </div>
        )}

        {/* Summary Row */}
        <div className="px-4 py-3 bg-muted border-b-2 border-border flex justify-between font-heading font-bold text-muted-foreground">
          <span>
            Showing {filteredTransactions.length} of {totalCount} transactions
            {totalCount > PAGE_SIZE && ` (Page ${currentPage} of ${Math.ceil(totalCount / PAGE_SIZE)})`}
          </span>
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

        {/* Pagination Controls */}
        {totalCount > PAGE_SIZE && !loading && (
          <div className="px-4 py-4 bg-white border-t-2 border-border flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft size={16} className="mr-1" />
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {Math.ceil(totalCount / PAGE_SIZE)}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(Math.ceil(totalCount / PAGE_SIZE), p + 1))}
              disabled={currentPage >= Math.ceil(totalCount / PAGE_SIZE)}
            >
              Next
              <ChevronRight size={16} className="ml-1" />
            </Button>
          </div>
        )}
      </Card>

      {/* Transaction Detail Drawer */}
      <TransactionDrawer
        transaction={selectedTransaction}
        categories={categories}
        onClose={() => setSelectedTransaction(null)}
        onCategoryChange={handleCategoryChange}
        onToggle={handleToggle}
      />
    </div>
  )
}
