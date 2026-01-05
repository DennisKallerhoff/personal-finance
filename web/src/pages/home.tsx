import { useState, useEffect } from 'react'
import { Link } from 'react-router'
import { Upload, AlertTriangle, Bell, TrendingUp, X } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import {
  formatAmount,
  getCurrentMonth,
  getMonthOptions,
  formatMonthLong,
  formatMonth,
  calculatePercentChange,
  formatCompactAmount
} from '@/lib/format'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, Legend } from 'recharts'

// Types for analytics data
interface MonthStats {
  expenses: number
  income: number
  net: number
  expensesTrend: number
  incomeTrend: number
}

interface TopCategory {
  category_name: string
  category_color: string
  expenses_cents: number
  prev_month_expenses: number
}

interface TrendData {
  month: string
  expenses: number
  income: number
  rolling_avg_3m: number | null
}

interface Signal {
  type: 'TREND_UP' | 'TREND_DOWN' | 'SUBSCRIPTION' | 'LARGE_TRANSACTION' | 'NEW_MERCHANT'
  title: string
  description: string
  severity: 'info' | 'warning' | 'alert'
  id: string
}

// Response types from Postgres RPC functions
interface TrendSignalResponse {
  signal_type: 'TREND_UP' | 'TREND_DOWN'
  severity: 'info' | 'warning' | 'alert'
  category_name: string
  change_pct: number
  month: string
}

interface SubscriptionSignalResponse {
  normalized_vendor: string
  frequency: string
  typical_amount: number
  confidence: 'high' | 'medium' | 'low'
}

interface LargeTransactionSignalResponse {
  transaction_id: string
  vendor: string
  amount: number
  date: string
}

interface NewMerchantSignalResponse {
  vendor: string
  first_occurrence: string
  amount: number
}

function MetricCard({ label, value, trend, valueColor }: {
  label: string
  value: string
  trend?: number
  valueColor?: string
}) {
  return (
    <Card className="relative overflow-hidden hover:shadow-md transition-all duration-200">
      <div className="absolute top-0 left-0 w-1 h-full bg-primary opacity-50" />
      <CardContent className="p-8">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span className={`block font-heading text-4xl font-bold mt-2 mb-3 ${valueColor || 'text-secondary'}`}>
          {value}
        </span>
        {trend !== undefined && (
          <span className={`inline-flex items-center gap-1 text-sm font-bold px-3 py-1 rounded ${
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

export default function Home() {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth())
  const [monthStats, setMonthStats] = useState<MonthStats | null>(null)
  const [topCategories, setTopCategories] = useState<TopCategory[]>([])
  const [trendData, setTrendData] = useState<TrendData[]>([])
  const [signals, setSignals] = useState<Signal[]>([])
  const [dismissedSignals, setDismissedSignals] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [showRollingAvg, setShowRollingAvg] = useState(false)

  const monthOptions = getMonthOptions(12)

  // Fetch data for Overview tab
  useEffect(() => {
    const fetchOverviewData = async () => {
      setLoading(true)

      try {
        // Fetch monthly summary for selected month
        const { data: monthData, error: monthError } = await supabase
          .from('monthly_summary')
          .select('*')
          .eq('month', selectedMonth)

        if (monthError) throw monthError

        // Calculate totals for the month
        const totalExpenses = monthData?.reduce((sum, row) => sum + (row.expenses_cents || 0), 0) || 0
        const totalIncome = monthData?.reduce((sum, row) => sum + (row.income_cents || 0), 0) || 0

        // Fetch previous month for trend calculation
        const prevMonthDate = new Date(selectedMonth)
        prevMonthDate.setMonth(prevMonthDate.getMonth() - 1)
        const prevMonth = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}-01`

        const { data: prevMonthData } = await supabase
          .from('monthly_summary')
          .select('*')
          .eq('month', prevMonth)

        const prevExpenses = prevMonthData?.reduce((sum, row) => sum + (row.expenses_cents || 0), 0) || 0
        const prevIncome = prevMonthData?.reduce((sum, row) => sum + (row.income_cents || 0), 0) || 0

        setMonthStats({
          expenses: totalExpenses,
          income: totalIncome,
          net: totalIncome - totalExpenses,
          expensesTrend: calculatePercentChange(prevExpenses, totalExpenses),
          incomeTrend: calculatePercentChange(prevIncome, totalIncome)
        })

        // Fetch top 5 categories for selected month
        const { data: categoryData } = await supabase
          .from('monthly_summary')
          .select('category_name, category_color, expenses_cents')
          .eq('month', selectedMonth)
          .not('category_name', 'is', null)
          .order('expenses_cents', { ascending: false })
          .limit(5)

        // Get previous month data for each category
        const topCats: TopCategory[] = []
        for (const cat of categoryData || []) {
          const { data: prevCatData } = await supabase
            .from('monthly_summary')
            .select('expenses_cents')
            .eq('month', prevMonth)
            .eq('category_name', cat.category_name)
            .maybeSingle()

          topCats.push({
            category_name: cat.category_name,
            category_color: cat.category_color || '#3b82f6',
            expenses_cents: cat.expenses_cents || 0,
            prev_month_expenses: prevCatData?.expenses_cents || 0
          })
        }

        setTopCategories(topCats)

      } catch (error) {
        console.error('Error fetching overview data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchOverviewData()
  }, [selectedMonth])

  // Fetch trend data (monthly_trends view)
  useEffect(() => {
    const fetchTrendData = async () => {
      try {
        const { data, error } = await supabase
          .from('monthly_trends')
          .select('*')
          .order('month', { ascending: true })
          .limit(12)

        if (error) throw error

        setTrendData(data || [])
      } catch (error) {
        console.error('Error fetching trend data:', error)
      }
    }

    fetchTrendData()
  }, [])

  // Fetch signals from detection functions
  useEffect(() => {
    const fetchSignals = async () => {
      try {
        const detectedSignals: Signal[] = []

        // Fetch trend signals
        const { data: trendSignals } = await supabase.rpc('detect_trend_signals')
        trendSignals?.forEach((sig: TrendSignalResponse) => {
          const key = `${sig.signal_type}:${sig.category_name}:${sig.month}`
          if (!dismissedSignals.has(key)) {
            detectedSignals.push({
              type: sig.signal_type,
              title: `${sig.signal_type === 'TREND_UP' ? 'Increase' : 'Decrease'}: ${sig.category_name}`,
              description: `Spending ${sig.signal_type === 'TREND_UP' ? 'increased' : 'decreased'} by ${Math.abs(sig.change_pct).toFixed(1)}% over the last 3 months`,
              severity: sig.severity,
              id: key
            })
          }
        })

        // Fetch subscription signals
        const { data: subSignals } = await supabase.rpc('detect_subscriptions')
        subSignals?.slice(0, 5).forEach((sig: SubscriptionSignalResponse) => {
          const key = `SUBSCRIPTION:${sig.normalized_vendor}`
          if (!dismissedSignals.has(key)) {
            detectedSignals.push({
              type: 'SUBSCRIPTION',
              title: `Subscription Detected: ${sig.normalized_vendor}`,
              description: `${sig.frequency} charge of ${formatAmount(sig.typical_amount)} (${sig.confidence} confidence)`,
              severity: sig.confidence === 'high' ? 'info' : 'warning',
              id: key
            })
          }
        })

        // Fetch large transaction signals
        const { data: largeSignals } = await supabase.rpc('detect_large_transactions', {
          lookback_months: 3,
          threshold_cents: 10000
        })
        largeSignals?.slice(0, 3).forEach((sig: LargeTransactionSignalResponse) => {
          const key = `LARGE_TRANSACTION:${sig.transaction_id}`
          if (!dismissedSignals.has(key)) {
            detectedSignals.push({
              type: 'LARGE_TRANSACTION',
              title: 'Large One-off Expense',
              description: `${formatAmount(sig.amount)} at "${sig.vendor}" on ${sig.date}`,
              severity: sig.amount > 20000 ? 'alert' : 'warning',
              id: key
            })
          }
        })

        // Fetch new merchant signals
        const { data: newMerchants } = await supabase.rpc('detect_new_merchants', { lookback_days: 30 })
        newMerchants?.slice(0, 3).forEach((sig: NewMerchantSignalResponse) => {
          const key = `NEW_MERCHANT:${sig.vendor}`
          if (!dismissedSignals.has(key)) {
            detectedSignals.push({
              type: 'NEW_MERCHANT',
              title: `New Merchant: ${sig.vendor}`,
              description: `First purchase on ${sig.first_occurrence} (${formatAmount(sig.amount)})`,
              severity: 'info',
              id: key
            })
          }
        })

        setSignals(detectedSignals)
      } catch (error) {
        console.error('Error fetching signals:', error)
      }
    }

    fetchSignals()
  }, [dismissedSignals])

  const handleDismissSignal = async (signalId: string, signalType: string) => {
    try {
      // Store dismissal in database
      await supabase.from('dismissed_signals').insert({
        signal_type: signalType,
        signal_key: signalId
      })

      // Update local state
      setDismissedSignals(prev => new Set([...prev, signalId]))
    } catch (error) {
      console.error('Error dismissing signal:', error)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64">Laden...</div>
  }

  return (
    <div>
      {/* Header with Month Selector */}
      <div className="flex items-center justify-between mb-10">
        <h2 className="text-4xl font-bold font-heading tracking-tight">{formatMonthLong(selectedMonth)}</h2>
        <div className="flex items-center gap-4">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[200px] border-2 font-semibold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Link to="/import">
            <Button className="gap-2 shadow-md hover:shadow-lg transition-all">
              <Upload size={18} />
              Upload Statement
            </Button>
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8 border-b-2 border-border bg-transparent h-auto p-0 rounded-none">
          <TabsTrigger
            value="overview"
            className="font-heading font-bold text-base text-muted-foreground data-[state=active]:text-secondary data-[state=active]:border-b-[3px] data-[state=active]:border-primary rounded-none pb-4 data-[state=active]:bg-transparent hover:text-secondary transition-colors"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="trends"
            className="font-heading font-bold text-base text-muted-foreground data-[state=active]:text-secondary data-[state=active]:border-b-[3px] data-[state=active]:border-primary rounded-none pb-4 data-[state=active]:bg-transparent hover:text-secondary transition-colors"
          >
            Trends
          </TabsTrigger>
          <TabsTrigger
            value="signals"
            className="font-heading font-bold text-base text-muted-foreground data-[state=active]:text-secondary data-[state=active]:border-b-[3px] data-[state=active]:border-primary rounded-none pb-4 data-[state=active]:bg-transparent hover:text-secondary transition-colors flex items-center gap-2"
          >
            Signals
            {signals.length > 0 && (
              <Badge variant="secondary" className="bg-[#fef3c7] text-[#92400e] font-bold text-[0.7em] px-2 py-0.5">
                {signals.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 animate-in fade-in-50 duration-300">
          {/* Key Metrics */}
          <div className="grid grid-cols-3 gap-6">
            <MetricCard
              label="Expenses"
              value={formatAmount(monthStats?.expenses || 0)}
              trend={monthStats?.expensesTrend}
            />
            <MetricCard
              label="Income"
              value={formatAmount(monthStats?.income || 0)}
              trend={monthStats?.incomeTrend}
            />
            <MetricCard
              label="Net Balance"
              value={formatAmount(Math.abs(monthStats?.net || 0))}
              valueColor={(monthStats?.net || 0) >= 0 ? 'text-[var(--success)]' : 'text-[var(--destructive)]'}
            />
          </div>

          {/* Top Categories */}
          <Card className="hover:shadow-md transition-all duration-200">
            <CardContent className="p-8">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-6">
                Top Categories
              </h3>
              {topCategories.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p className="font-semibold">No category data available for this month.</p>
                  <p className="text-sm mt-2">Import transactions to see spending breakdown.</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-border">
                      <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground pb-4">
                        Category
                      </th>
                      <th className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground pb-4">
                        Amount
                      </th>
                      <th className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground pb-4">
                        Change
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {topCategories.map((cat) => {
                      const trend = calculatePercentChange(cat.prev_month_expenses, cat.expenses_cents)
                      return (
                        <tr key={cat.category_name} className="border-b border-border hover:bg-[#fafafa] transition-colors">
                          <td className="py-4 font-semibold">{cat.category_name}</td>
                          <td className="py-4 text-right font-heading font-semibold text-base">
                            {formatAmount(cat.expenses_cents)}
                          </td>
                          <td className="py-4 text-right">
                            <span className={`inline-flex items-center text-xs font-bold px-2.5 py-1 rounded-full uppercase ${
                              trend > 0
                                ? 'bg-[var(--destructive-light)] text-[#991b1b]'
                                : trend < 0
                                  ? 'bg-[var(--success-light)] text-[#166534]'
                                  : 'bg-muted text-muted-foreground'
                            }`}>
                              {trend > 0 ? '+' : ''}{trend.toFixed(0)}%
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-6">
          <Card className="hover:shadow-md transition-all duration-200">
            <CardContent className="p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Monthly Trends (12 Months)
                </h3>
                <label className="flex items-center gap-2 text-sm font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showRollingAvg}
                    onChange={(e) => setShowRollingAvg(e.target.checked)}
                    className="accent-primary w-4 h-4"
                  />
                  Rolling 3-month avg
                </label>
              </div>
              {trendData.length < 2 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <p className="font-bold text-lg">Insufficient data for trend analysis</p>
                  <p className="text-sm mt-2">Import at least 2 months of transactions to see trends.</p>
                  <p className="text-sm mt-1">(Currently: {trendData.length} month{trendData.length !== 1 ? 's' : ''})</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={trendData}>
                    <XAxis
                      dataKey="month"
                      tickFormatter={(m) => formatMonth(m)}
                      stroke="#6b7280"
                      style={{ fontSize: '0.8rem', fontWeight: 600 }}
                    />
                    <YAxis
                      tickFormatter={(v) => formatCompactAmount(v)}
                      stroke="#6b7280"
                      style={{ fontSize: '0.8rem', fontWeight: 600 }}
                    />
                    <Tooltip
                      formatter={(value) => formatAmount(value as number)}
                      labelFormatter={(label) => formatMonthLong(label)}
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '2px solid #e5e7eb',
                        borderRadius: '8px',
                        padding: '12px',
                        fontWeight: 600
                      }}
                    />
                    <Legend
                      wrapperStyle={{ paddingTop: '20px', fontWeight: 600 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="expenses"
                      stroke="#ef4444"
                      name="Expenses"
                      strokeWidth={3}
                      dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="income"
                      stroke="#22c55e"
                      name="Income"
                      strokeWidth={3}
                      dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                    />
                    {showRollingAvg && (
                      <Line
                        type="monotone"
                        dataKey="rolling_avg_3m"
                        stroke="#3b82f6"
                        name="3-Month Avg"
                        strokeWidth={3}
                        strokeDasharray="5 5"
                        dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Signals Tab */}
        <TabsContent value="signals" className="space-y-6">
          {signals.length === 0 ? (
            <Card className="hover:shadow-md transition-all duration-200">
              <CardContent className="p-16 text-center">
                <div className="text-7xl mb-6">🎉</div>
                <h3 className="text-2xl font-bold mb-3">Alles im grünen Bereich!</h3>
                <p className="text-muted-foreground text-base max-w-lg mx-auto">
                  No unusual patterns detected. Signals appear when spending changes significantly,
                  new subscriptions are found, or large one-time expenses occur.
                </p>
              </CardContent>
            </Card>
          ) : (
            signals.map((signal) => (
              <Card
                key={signal.id}
                className={`border-l-[6px] hover:shadow-md transition-all duration-200 ${
                  signal.severity === 'alert' ? 'border-l-[#ef4444]' :
                  signal.severity === 'warning' ? 'border-l-[#f59e0b]' :
                  'border-l-[#3b82f6]'
                }`}
              >
                <CardContent className="p-8">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-6 flex-1">
                      <div className={`flex items-center justify-center w-12 h-12 rounded-full text-2xl ${
                        signal.severity === 'alert' ? 'bg-[#fee2e2] text-[#ef4444]' :
                        signal.severity === 'warning' ? 'bg-[#fef3c7] text-[#f59e0b]' :
                        'bg-[#dbeafe] text-[#3b82f6]'
                      }`}>
                        {signal.type === 'TREND_UP' || signal.type === 'TREND_DOWN' ? (
                          <TrendingUp size={24} />
                        ) : signal.type === 'SUBSCRIPTION' ? (
                          <Bell size={24} />
                        ) : (
                          <AlertTriangle size={24} />
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-lg mb-1">{signal.title}</h4>
                        <p className="text-muted-foreground">{signal.description}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDismissSignal(signal.id, signal.type)}
                      className="ml-4 hover:bg-muted"
                    >
                      <X size={18} />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
