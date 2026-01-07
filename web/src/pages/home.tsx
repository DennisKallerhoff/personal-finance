import { useState, useEffect } from 'react'
import { Link } from 'react-router'
import { Upload, TrendingUp, TrendingDown, AlertCircle, Bell } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import {
  formatAmount,
  formatMonthLong,
  formatMonth,
  calculatePercentChange,
  formatCompactAmount
} from '@/lib/format'
import { ResponsiveContainer, XAxis, YAxis, Tooltip, LineChart, Line, Legend } from 'recharts'

// Types
interface DashboardStats {
  expenses: number
  income: number
  net: number
  expensesTrend: number
  incomeTrend: number
}

interface TopItem {
  name: string
  expenses_cents: number
  prev_period_expenses: number
  color?: string
}

interface TrendData {
  month: string
  expenses: number
  income: number
}

interface Signal {
  type: 'TREND_UP' | 'TREND_DOWN' | 'SUBSCRIPTION' | 'LARGE_TRANSACTION' | 'NEW_MERCHANT'
  title: string
  description: string
  severity: 'info' | 'warning' | 'alert'
  id: string
}

type DateRange = 'last60' | 'last90' | 'last180' | 'last365' | 'year2024' | 'year2025' | 'year2026' | 'custom'

function MetricCard({ label, value, trend, valueColor }: {
  label: string
  value: string
  trend?: number
  valueColor?: string
}) {
  return (
    <Card className="relative overflow-hidden hover:shadow-md transition-all duration-200">
      <div className="absolute top-0 left-0 w-1 h-full bg-primary opacity-50" />
      <CardContent className="p-6">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span className={`block font-heading text-3xl font-bold mt-2 mb-2 ${valueColor || 'text-secondary'}`}>
          {value}
        </span>
        {trend !== undefined && (
          <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded ${
            trend > 0
              ? 'bg-[var(--destructive-light)] text-[#991b1b]'
              : trend < 0
                ? 'bg-[var(--success-light)] text-[#166534]'
                : 'bg-muted text-muted-foreground'
          }`}>
            {trend > 0 ? '▲' : trend < 0 ? '▼' : '—'} {Math.abs(trend).toFixed(1)}%
          </span>
        )}
      </CardContent>
    </Card>
  )
}

function SignalCard({ signal, onDismiss }: { signal: Signal; onDismiss: () => void }) {
  const icons = {
    TREND_UP: TrendingUp,
    TREND_DOWN: TrendingDown,
    SUBSCRIPTION: Bell,
    LARGE_TRANSACTION: AlertCircle,
    NEW_MERCHANT: AlertCircle
  }
  const Icon = icons[signal.type]

  return (
    <Card className={`hover:shadow-md transition-all duration-200 border-l-4 ${
      signal.severity === 'alert' ? 'border-l-[#ef4444]' :
      signal.severity === 'warning' ? 'border-l-[#f59e0b]' :
      'border-l-[#3b82f6]'
    }`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
            signal.severity === 'alert' ? 'bg-[#fee2e2] text-[#ef4444]' :
            signal.severity === 'warning' ? 'bg-[#fef3c7] text-[#f59e0b]' :
            'bg-[#dbeafe] text-[#3b82f6]'
          }`}>
            <Icon size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-sm mb-0.5">{signal.title}</h4>
            <p className="text-xs text-muted-foreground">{signal.description}</p>
          </div>
          <button
            onClick={onDismiss}
            className="flex-shrink-0 text-muted-foreground hover:text-foreground"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </CardContent>
    </Card>
  )
}

export default function Home() {
  const [dateRange, setDateRange] = useState<DateRange>('last90')
  const [customMonth, setCustomMonth] = useState<string>('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [topCategories, setTopCategories] = useState<TopItem[]>([])
  const [topVendors, setTopVendors] = useState<TopItem[]>([])
  const [trendData, setTrendData] = useState<TrendData[]>([])
  const [categoryTrendData, setCategoryTrendData] = useState<TrendData[]>([])
  const [signals, setSignals] = useState<Signal[]>([])
  const [loading, setLoading] = useState(true)
  const [categoryTransactions, setCategoryTransactions] = useState<any[]>([])
  const [loadingCategory, setLoadingCategory] = useState(false)
  const [loadingCategoryTrend, setLoadingCategoryTrend] = useState(false)

  // Calculate date range
  const getDateRangeParams = () => {
    const today = new Date()
    let startDate: Date
    let endDate = today

    switch (dateRange) {
      case 'last60':
        startDate = new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000)
        break
      case 'last90':
        startDate = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000)
        break
      case 'last180':
        startDate = new Date(today.getTime() - 180 * 24 * 60 * 60 * 1000)
        break
      case 'last365':
        startDate = new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000)
        break
      case 'year2024':
        startDate = new Date(2024, 0, 1)
        endDate = new Date(2024, 11, 31)
        break
      case 'year2025':
        startDate = new Date(2025, 0, 1)
        endDate = new Date(2025, 11, 31)
        break
      case 'year2026':
        startDate = new Date(2026, 0, 1)
        endDate = new Date(2026, 11, 31)
        break
      case 'custom':
        if (!customMonth) return null
        const [year, month] = customMonth.split('-')
        startDate = new Date(parseInt(year), parseInt(month) - 1, 1)
        endDate = new Date(parseInt(year), parseInt(month), 0)
        break
      default:
        startDate = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000)
    }

    return {
      start: startDate.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0]
    }
  }

  // Fetch dashboard data
  useEffect(() => {
    const fetchData = async () => {
      const dateParams = getDateRangeParams()
      if (!dateParams) return

      setLoading(true)

      try {
        // Fetch transactions for the period
        const { data: transactions } = await supabase
          .from('transactions')
          .select('amount, direction, normalized_vendor, category_id, categories(name, color)')
          .gte('date', dateParams.start)
          .lte('date', dateParams.end)
          .eq('is_transfer', false)

        if (!transactions) return

        // Calculate stats
        const expenses = transactions
          .filter(t => t.direction === 'debit')
          .reduce((sum, t) => sum + t.amount, 0)

        const income = transactions
          .filter(t => t.direction === 'credit')
          .reduce((sum, t) => sum + t.amount, 0)

        // Previous period for trends (same duration)
        const duration = new Date(dateParams.end).getTime() - new Date(dateParams.start).getTime()
        const prevEnd = new Date(new Date(dateParams.start).getTime() - 24 * 60 * 60 * 1000)
        const prevStart = new Date(prevEnd.getTime() - duration)

        const { data: prevTransactions } = await supabase
          .from('transactions')
          .select('amount, direction')
          .gte('date', prevStart.toISOString().split('T')[0])
          .lte('date', prevEnd.toISOString().split('T')[0])
          .eq('is_transfer', false)

        const prevExpenses = prevTransactions
          ?.filter(t => t.direction === 'debit')
          .reduce((sum, t) => sum + t.amount, 0) || 0

        const prevIncome = prevTransactions
          ?.filter(t => t.direction === 'credit')
          .reduce((sum, t) => sum + t.amount, 0) || 0

        setStats({
          expenses,
          income,
          net: income - expenses,
          expensesTrend: calculatePercentChange(prevExpenses, expenses),
          incomeTrend: calculatePercentChange(prevIncome, income)
        })

        // Top categories
        const categoryMap = new Map<string, { amount: number; color: string }>()
        transactions
          .filter(t => t.direction === 'debit' && t.categories)
          .forEach(t => {
            const name = (t.categories as any).name
            const color = (t.categories as any).color
            const existing = categoryMap.get(name) || { amount: 0, color: color || '#3b82f6' }
            categoryMap.set(name, { amount: existing.amount + t.amount, color: existing.color })
          })

        const topCats = Array.from(categoryMap.entries())
          .map(([name, { amount, color }]) => ({
            name,
            expenses_cents: amount,
            prev_period_expenses: 0, // TODO: Calculate from prev period
            color
          }))
          .sort((a, b) => b.expenses_cents - a.expenses_cents)
          .slice(0, 5)

        setTopCategories(topCats)

        // Top vendors
        const vendorMap = new Map<string, number>()
        transactions
          .filter(t => t.direction === 'debit' && t.normalized_vendor)
          .forEach(t => {
            const existing = vendorMap.get(t.normalized_vendor!) || 0
            vendorMap.set(t.normalized_vendor!, existing + t.amount)
          })

        const topVends = Array.from(vendorMap.entries())
          .map(([name, amount]) => ({
            name,
            expenses_cents: amount,
            prev_period_expenses: 0
          }))
          .sort((a, b) => b.expenses_cents - a.expenses_cents)
          .slice(0, 5)

        setTopVendors(topVends)

        // Trend data (last 6 months) - aggregate from monthly_summary
        const sixMonthsAgo = new Date()
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
        const sixMonthsAgoStr = `${sixMonthsAgo.getFullYear()}-${String(sixMonthsAgo.getMonth() + 1).padStart(2, '0')}-01`

        const { data: monthlySummary } = await supabase
          .from('monthly_summary')
          .select('month, expenses_cents, income_cents')
          .gte('month', sixMonthsAgoStr)
          .order('month', { ascending: true })

        // Aggregate by month
        const trendMap = new Map<string, { expenses: number; income: number }>()
        monthlySummary?.forEach(row => {
          if (!row.month) return
          const existing = trendMap.get(row.month) || { expenses: 0, income: 0 }
          trendMap.set(row.month, {
            expenses: existing.expenses + (row.expenses_cents || 0),
            income: existing.income + (row.income_cents || 0)
          })
        })

        const trends = Array.from(trendMap.entries()).map(([month, data]) => ({
          month,
          expenses: data.expenses,
          income: data.income
        }))

        setTrendData(trends)

        // Fetch signals - mock data for now since RPC functions may not be available
        const mockSignals: Signal[] = []

        // Check for large transactions in current period
        const largeTransactions = transactions
          .filter(t => t.direction === 'debit' && t.amount > 10000)
          .slice(0, 3)

        largeTransactions.forEach(t => {
          mockSignals.push({
            type: 'LARGE_TRANSACTION',
            title: `Large Expense: ${t.normalized_vendor || 'Unknown'}`,
            description: `${formatAmount(t.amount)} - This is above your typical spending`,
            severity: t.amount > 20000 ? 'alert' : 'warning',
            id: `large_${t.normalized_vendor}_${t.amount}`
          })
        })

        // Check for spending increase
        const expensesTrend = calculatePercentChange(prevExpenses, expenses)
        if (expensesTrend > 15) {
          mockSignals.push({
            type: 'TREND_UP',
            title: 'Spending Increased',
            description: `Your expenses increased by ${expensesTrend.toFixed(1)}% compared to the previous period`,
            severity: 'warning',
            id: 'trend_up_overall'
          })
        }

        setSignals(mockSignals)

      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [dateRange, customMonth])

  // Fetch category transactions when selected
  useEffect(() => {
    const fetchCategoryTransactions = async () => {
      if (!selectedCategory) {
        setCategoryTransactions([])
        return
      }

      const dateParams = getDateRangeParams()
      if (!dateParams) return

      setLoadingCategory(true)

      try {
        const { data: transactions } = await supabase
          .from('transactions')
          .select('id, date, amount, direction, normalized_vendor, raw_vendor, categories(name)')
          .gte('date', dateParams.start)
          .lte('date', dateParams.end)
          .eq('is_transfer', false)
          .eq('direction', 'debit')

        const filtered = transactions?.filter(t =>
          (t.categories as any)?.name === selectedCategory
        ) || []

        // Sort by date descending
        filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

        setCategoryTransactions(filtered)
      } catch (error) {
        console.error('Error fetching category transactions:', error)
      } finally {
        setLoadingCategory(false)
      }
    }

    fetchCategoryTransactions()
  }, [selectedCategory, dateRange, customMonth])

  // Fetch category trend data when selected
  useEffect(() => {
    const fetchCategoryTrend = async () => {
      if (!selectedCategory) {
        setCategoryTrendData([])
        return
      }

      setLoadingCategoryTrend(true)

      try {
        // Fetch last 6 months of data for this category
        const sixMonthsAgo = new Date()
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
        const sixMonthsAgoStr = `${sixMonthsAgo.getFullYear()}-${String(sixMonthsAgo.getMonth() + 1).padStart(2, '0')}-01`

        const { data: monthlySummary } = await supabase
          .from('monthly_summary')
          .select('month, category_name, expenses_cents')
          .eq('category_name', selectedCategory)
          .gte('month', sixMonthsAgoStr)
          .order('month', { ascending: true })

        // Group by month
        const trendMap = new Map<string, number>()
        monthlySummary?.forEach(row => {
          if (!row.month) return
          const existing = trendMap.get(row.month) || 0
          trendMap.set(row.month, existing + (row.expenses_cents || 0))
        })

        const trends = Array.from(trendMap.entries()).map(([month, expenses]) => ({
          month,
          expenses,
          income: 0 // Not relevant for category view
        }))

        setCategoryTrendData(trends)
      } catch (error) {
        console.error('Error fetching category trend:', error)
      } finally {
        setLoadingCategoryTrend(false)
      }
    }

    fetchCategoryTrend()
  }, [selectedCategory])

  const handleDismissSignal = async (signalId: string, _signalType: string) => {
    // Filter out the signal from display
    setSignals(prev => prev.filter(s => s.id !== signalId))

    // Note: dismissed_signals table storage could be implemented later if needed
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64">Laden...</div>
  }

  const displayLabel = dateRange === 'custom' && customMonth
    ? formatMonthLong(customMonth + '-01')
    : dateRange === 'last60' ? 'Last 60 Days'
    : dateRange === 'last90' ? 'Last 90 Days'
    : dateRange === 'last180' ? 'Last 180 Days'
    : dateRange === 'last365' ? 'Last Year'
    : dateRange === 'year2024' ? '2024'
    : dateRange === 'year2025' ? '2025'
    : dateRange === 'year2026' ? '2026'
    : 'Last 90 Days'

  return (
    <div className="pb-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-bold font-heading tracking-tight">{displayLabel}</h2>
        <div className="flex items-center gap-3">
          <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
            <SelectTrigger className="w-[180px] border-2 font-semibold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last60">Last 60 Days</SelectItem>
              <SelectItem value="last90">Last 90 Days</SelectItem>
              <SelectItem value="last180">Last 180 Days</SelectItem>
              <SelectItem value="last365">Last 365 Days</SelectItem>
              <SelectItem value="year2024">2024</SelectItem>
              <SelectItem value="year2025">2025</SelectItem>
              <SelectItem value="year2026">2026</SelectItem>
              <SelectItem value="custom">Custom Month</SelectItem>
            </SelectContent>
          </Select>

          {dateRange === 'custom' && (
            <input
              type="month"
              value={customMonth}
              onChange={(e) => setCustomMonth(e.target.value)}
              className="border-2 border-border rounded-md px-3 py-2 font-semibold text-sm"
            />
          )}

          <Link to="/import">
            <Button className="gap-2 shadow-md hover:shadow-lg transition-all">
              <Upload size={18} />
              Upload Statement
            </Button>
          </Link>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        <MetricCard
          label="Expenses"
          value={formatAmount(stats?.expenses || 0)}
          trend={stats?.expensesTrend}
        />
        <MetricCard
          label="Income"
          value={formatAmount(stats?.income || 0)}
          trend={stats?.incomeTrend}
        />
        <MetricCard
          label="Net Balance"
          value={formatAmount(Math.abs(stats?.net || 0))}
          valueColor={(stats?.net || 0) >= 0 ? 'text-[var(--success)]' : 'text-[var(--destructive)]'}
        />
      </div>

      {/* Top Categories & Top Vendors */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        <Card className="hover:shadow-md transition-all duration-200">
          <CardContent className="p-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-5">
              Top Categories
            </h3>
            {topCategories.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">No category data available</p>
              </div>
            ) : (
              <div className="space-y-3">
                {topCategories.map((cat) => (
                  <button
                    key={cat.name}
                    onClick={() => setSelectedCategory(selectedCategory === cat.name ? null : cat.name)}
                    className={`w-full flex items-center justify-between py-2 px-2 rounded transition-colors ${
                      selectedCategory === cat.name
                        ? 'bg-primary/10 ring-2 ring-primary'
                        : 'hover:bg-muted/30'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: cat.color || '#3b82f6' }}
                      />
                      <span className="font-semibold text-sm">{cat.name}</span>
                    </div>
                    <span className="font-heading font-bold text-sm">
                      {formatAmount(cat.expenses_cents)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-all duration-200">
          <CardContent className="p-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-5">
              Top Vendors
            </h3>
            {topVendors.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">No vendor data available</p>
              </div>
            ) : (
              <div className="space-y-3">
                {topVendors.map((vendor) => (
                  <div key={vendor.name} className="flex items-center justify-between py-2 hover:bg-muted/30 px-2 rounded transition-colors">
                    <span className="font-semibold text-sm">{vendor.name}</span>
                    <span className="font-heading font-bold text-sm">
                      {formatAmount(vendor.expenses_cents)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Category Details */}
      {selectedCategory && (
        <Card className="hover:shadow-md transition-all duration-200 mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {selectedCategory} - Transactions
              </h3>
              <button
                onClick={() => setSelectedCategory(null)}
                className="text-sm font-semibold text-muted-foreground hover:text-foreground"
              >
                Close ✕
              </button>
            </div>
            {loadingCategory ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">Loading...</p>
              </div>
            ) : categoryTransactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">No transactions found</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {categoryTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between py-2 px-3 hover:bg-muted/30 rounded transition-colors border-b border-border last:border-0"
                  >
                    <div className="flex-1">
                      <div className="font-semibold text-sm">
                        {tx.normalized_vendor || tx.raw_vendor || 'Unknown'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(tx.date).toLocaleDateString('de-DE')}
                      </div>
                    </div>
                    <div className="font-heading font-bold text-sm">
                      {formatAmount(tx.amount)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Spending Trends */}
      <Card className="hover:shadow-md transition-all duration-200 mb-8">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {selectedCategory ? `${selectedCategory} - Spending Trend` : 'Spending Trends (Last 6 Months)'}
            </h3>
            {selectedCategory && (
              <button
                onClick={() => setSelectedCategory(null)}
                className="text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                Show All Categories
              </button>
            )}
          </div>

          {loadingCategoryTrend ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="font-semibold">Loading trend data...</p>
            </div>
          ) : selectedCategory ? (
            categoryTrendData.length < 2 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p className="font-semibold">Insufficient data for trend analysis</p>
                <p className="text-sm mt-2">Need at least 2 months of data for {selectedCategory}.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={categoryTrendData}>
                  <XAxis
                    dataKey="month"
                    tickFormatter={(m) => formatMonth(m)}
                    stroke="#6b7280"
                    style={{ fontSize: '0.75rem', fontWeight: 600 }}
                  />
                  <YAxis
                    tickFormatter={(v) => formatCompactAmount(v)}
                    stroke="#6b7280"
                    style={{ fontSize: '0.75rem', fontWeight: 600 }}
                  />
                  <Tooltip
                    formatter={(value) => formatAmount(value as number)}
                    labelFormatter={(label) => formatMonthLong(label)}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '2px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '8px',
                      fontSize: '0.875rem',
                      fontWeight: 600
                    }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '16px', fontSize: '0.875rem', fontWeight: 600 }} />
                  <Line
                    type="monotone"
                    dataKey="expenses"
                    stroke="#3b82f6"
                    name={selectedCategory}
                    strokeWidth={2.5}
                    dot={{ r: 3, strokeWidth: 2, fill: '#fff' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )
          ) : (
            trendData.length < 2 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p className="font-semibold">Insufficient data for trend analysis</p>
                <p className="text-sm mt-2">Import at least 2 months of transactions.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendData}>
                  <XAxis
                    dataKey="month"
                    tickFormatter={(m) => formatMonth(m)}
                    stroke="#6b7280"
                    style={{ fontSize: '0.75rem', fontWeight: 600 }}
                  />
                  <YAxis
                    tickFormatter={(v) => formatCompactAmount(v)}
                    stroke="#6b7280"
                    style={{ fontSize: '0.75rem', fontWeight: 600 }}
                  />
                  <Tooltip
                    formatter={(value) => formatAmount(value as number)}
                    labelFormatter={(label) => formatMonthLong(label)}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '2px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '8px',
                      fontSize: '0.875rem',
                      fontWeight: 600
                    }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '16px', fontSize: '0.875rem', fontWeight: 600 }} />
                  <Line
                    type="monotone"
                    dataKey="expenses"
                    stroke="#ef4444"
                    name="Expenses"
                    strokeWidth={2.5}
                    dot={{ r: 3, strokeWidth: 2, fill: '#fff' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="income"
                    stroke="#22c55e"
                    name="Income"
                    strokeWidth={2.5}
                    dot={{ r: 3, strokeWidth: 2, fill: '#fff' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )
          )}
        </CardContent>
      </Card>

      {/* Signals */}
      {signals.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold font-heading">
              Signals
              <Badge variant="secondary" className="ml-2 bg-[#fef3c7] text-[#92400e] font-bold">
                {signals.length}
              </Badge>
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {signals.map((signal) => (
              <SignalCard
                key={signal.id}
                signal={signal}
                onDismiss={() => handleDismissSignal(signal.id, signal.type)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
