import React, { useState, useEffect } from 'react'
import { Link } from 'react-router'
import { Upload, TrendingUp, TrendingDown, AlertCircle, Bell, Search } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import {
  formatAmount,
  formatMonthLong,
  formatMonth,
  calculatePercentChange,
  formatCompactAmount
} from '@/lib/format'
import { ResponsiveContainer, XAxis, YAxis, Tooltip, LineChart, Line, Legend, Treemap } from 'recharts'

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

interface TreemapNode {
  name: string
  color?: string
  icon?: string
  size?: number              // For leaf nodes (no children)
  children?: TreemapNode[]   // For parent nodes
}

interface CustomTreemapContentProps {
  x?: number
  y?: number
  width?: number
  height?: number
  name?: string
  value?: number
  color?: string
  depth?: number
  root?: any
  index?: number
}

interface CategoryHierarchyTableProps {
  treemapData: TreemapNode[]
  selectedCategory: string | null
  onSelectCategory: (category: string | null) => void
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

// Helper function to build hierarchical category select options
function buildCategorySelectOptions(categories: any[]): JSX.Element[] {
  const parents = categories.filter(c => !c.parent_id).sort((a, b) => a.name.localeCompare(b.name))
  const result: JSX.Element[] = []

  parents.forEach(parent => {
    const children = categories.filter(c => c.parent_id === parent.id).sort((a, b) => a.name.localeCompare(b.name))

    if (children.length > 0) {
      // Parent with children: use SelectGroup with SelectLabel
      result.push(
        <SelectGroup key={`group-${parent.id}`}>
          <SelectLabel>
            {parent.icon ? `${parent.icon} ` : ''}{parent.name}
          </SelectLabel>
          {children.map(child => (
            <SelectItem key={child.id} value={child.name}>
              {child.icon ? `  ${child.icon} ` : '  → '}{child.name}
            </SelectItem>
          ))}
        </SelectGroup>
      )
    } else {
      // Parent without children: direct SelectItem
      result.push(
        <SelectItem key={parent.id} value={parent.name}>
          {parent.icon ? `${parent.icon} ` : ''}{parent.name}
        </SelectItem>
      )
    }
  })

  return result
}

// Custom renderer for treemap rectangles
function CustomTreemapContent({
  x = 0,
  y = 0,
  width = 0,
  height = 0,
  name = '',
  value = 0,
  color = '#3b82f6',
  depth = 0
}: CustomTreemapContentProps) {
  const [isHovered, setIsHovered] = React.useState(false)
  const isParent = depth === 1
  const fontSize = isParent ? 14 : 12
  const fontWeight = isParent ? 600 : 500

  // Only show text if rectangle is large enough
  const showParentText = isParent && width > 60 && height > 30
  const showChildText = !isParent && width > 40 && height > 25 && isHovered

  return (
    <g
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={color}
        fillOpacity={isParent ? 0.75 : 0.85}
        stroke="#fff"
        strokeWidth={2}
        className="transition-all duration-200 hover:fill-opacity-100"
        style={{ cursor: 'pointer' }}
      />
      {(showParentText || showChildText) && (
        <>
          {/* Category name - background shadow */}
          <text
            x={x + width / 2}
            y={y + height / 2 - (isParent && value ? 10 : 0)}
            textAnchor="middle"
            fill="#000"
            fillOpacity={0.5}
            fontSize={fontSize}
            fontWeight={fontWeight}
            dominantBaseline="middle"
            style={{
              pointerEvents: 'none'
            }}
          >
            {name}
          </text>
          {/* Category name - main text */}
          <text
            x={x + width / 2}
            y={y + height / 2 - (isParent && value ? 10 : 0)}
            textAnchor="middle"
            fill="#fff"
            fontSize={fontSize}
            fontWeight={fontWeight}
            dominantBaseline="middle"
            style={{
              pointerEvents: 'none',
              textShadow: '0 0 4px rgba(0,0,0,0.8), 0 0 8px rgba(0,0,0,0.6), 0 2px 4px rgba(0,0,0,0.9)'
            }}
          >
            {name}
          </text>

          {/* Amount for parent categories */}
          {isParent && value > 0 && width > 80 && height > 50 && (
            <>
              {/* Amount - background shadow */}
              <text
                x={x + width / 2}
                y={y + height / 2 + 12}
                textAnchor="middle"
                fill="#000"
                fillOpacity={0.5}
                fontSize={11}
                fontWeight={600}
                dominantBaseline="middle"
                style={{
                  pointerEvents: 'none'
                }}
              >
                {formatAmount(value)}
              </text>
              {/* Amount - main text */}
              <text
                x={x + width / 2}
                y={y + height / 2 + 12}
                textAnchor="middle"
                fill="#fff"
                fontSize={11}
                fontWeight={600}
                dominantBaseline="middle"
                style={{
                  pointerEvents: 'none',
                  textShadow: '0 0 4px rgba(0,0,0,0.8), 0 0 8px rgba(0,0,0,0.6), 0 2px 4px rgba(0,0,0,0.9)'
                }}
              >
                {formatAmount(value)}
              </text>
            </>
          )}
        </>
      )}
    </g>
  )
}

// Hierarchical category table component
function CategoryHierarchyTable({
  treemapData,
  selectedCategory,
  onSelectCategory
}: CategoryHierarchyTableProps) {
  if (treemapData.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-sm">No category data available</p>
      </div>
    )
  }

  // Calculate total for percentages
  const total = treemapData.reduce((sum, node) => {
    if (node.children) {
      return sum + node.children.reduce((s, c) => s + (c.size || 0), 0)
    }
    return sum + (node.size || 0)
  }, 0)

  return (
    <div className="space-y-1 max-h-[400px] overflow-y-auto">
      {treemapData.map((parent) => {
        const hasChildren = parent.children && parent.children.length > 0
        const parentTotal = hasChildren
          ? parent.children.reduce((s, c) => s + (c.size || 0), 0)
          : (parent.size || 0)

        return (
          <div key={parent.name} className="space-y-0.5">
            {/* Parent Category Row */}
            {!hasChildren && (
              <button
                onClick={() => onSelectCategory(
                  selectedCategory === parent.name ? null : parent.name
                )}
                className={`w-full text-left p-2 rounded-md transition-all flex items-center justify-between group ${
                  selectedCategory === parent.name
                    ? 'bg-primary/10 ring-2 ring-primary'
                    : 'hover:bg-muted/50'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div
                    className="w-3 h-3 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: parent.color || '#3b82f6' }}
                  />
                  <span className="font-semibold text-sm truncate">
                    {parent.icon && `${parent.icon} `}
                    {parent.name}
                  </span>
                </div>
                <span className="text-sm font-semibold text-right ml-2">
                  {formatAmount(parentTotal)}
                </span>
              </button>
            )}

            {/* Parent header (if has children) */}
            {hasChildren && (
              <div className="p-2 bg-muted/30 rounded-md flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-sm"
                    style={{ backgroundColor: parent.color || '#3b82f6' }}
                  />
                  <span className="font-bold text-sm">
                    {parent.icon && `${parent.icon} `}
                    {parent.name}
                  </span>
                </div>
                <span className="text-sm font-bold">
                  {formatAmount(parentTotal)}
                </span>
              </div>
            )}

            {/* Child Categories */}
            {hasChildren && parent.children?.map((child) => (
              <button
                key={child.name}
                onClick={() => onSelectCategory(
                  selectedCategory === child.name ? null : child.name
                )}
                className={`w-full text-left p-2 pl-8 rounded-md transition-all flex items-center justify-between group ${
                  selectedCategory === child.name
                    ? 'bg-primary/10 ring-2 ring-primary'
                    : 'hover:bg-muted/30'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div
                    className="w-2 h-2 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: child.color || '#3b82f6' }}
                  />
                  <span className="text-sm truncate">
                    {child.icon && `${child.icon} `}
                    {child.name}
                  </span>
                </div>
                <span className="text-sm text-right ml-2">
                  {formatAmount(child.size || 0)}
                </span>
              </button>
            ))}
          </div>
        )
      })}
    </div>
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
  const [categories, setCategories] = useState<any[]>([])
  const [showCategoryPicker, setShowCategoryPicker] = useState(false)
  const [treemapData, setTreemapData] = useState<TreemapNode[]>([])

  // Helper to get category display name with hierarchy
  const getCategoryDisplayName = (categoryName: string): string => {
    const category = categories.find(c => c.name === categoryName)
    if (!category || !category.parent_id) return categoryName

    const parent = categories.find(c => c.id === category.parent_id)
    return parent ? `${parent.name} > ${categoryName}` : categoryName
  }

  // Build hierarchical treemap data from transactions and categories
  const buildTreemapData = (
    transactions: any[],
    categories: any[]
  ): TreemapNode[] => {
    // Step 1: Aggregate expenses by category_id
    const categoryExpenses = new Map<string, number>()
    transactions
      .filter(t => t.direction === 'debit' && t.category_id)
      .forEach(t => {
        const existing = categoryExpenses.get(t.category_id) || 0
        categoryExpenses.set(t.category_id, existing + t.amount)
      })

    // Step 2: Build parent → children map
    const parentMap = new Map<string, any[]>()
    categories.forEach(cat => {
      const parentId = cat.parent_id || 'root'
      const siblings = parentMap.get(parentId) || []
      siblings.push(cat)
      parentMap.set(parentId, siblings)
    })

    // Step 3: Build treemap nodes
    const result: TreemapNode[] = []
    const parents = categories.filter(c => !c.parent_id)

    parents.forEach(parent => {
      const children = parentMap.get(parent.id) || []

      if (children.length > 0) {
        // Parent with children: create hierarchical node
        const childNodes = children
          .map(child => ({
            name: child.name,
            size: categoryExpenses.get(child.id) || 0,
            color: child.color || '#3b82f6',
            icon: child.icon
          }))
          .filter(node => node.size > 0)
          .sort((a, b) => b.size - a.size)

        if (childNodes.length > 0) {
          result.push({
            name: parent.name,
            color: parent.color || '#3b82f6',
            icon: parent.icon,
            children: childNodes
          })
        }
      } else {
        // Parent without children: leaf node
        const size = categoryExpenses.get(parent.id) || 0
        if (size > 0) {
          result.push({
            name: parent.name,
            size,
            color: parent.color || '#3b82f6',
            icon: parent.icon
          })
        }
      }
    })

    // Sort by total size (parent size or sum of children)
    return result.sort((a, b) => {
      const aSize = a.size || a.children?.reduce((sum, c) => sum + (c.size || 0), 0) || 0
      const bSize = b.size || b.children?.reduce((sum, c) => sum + (c.size || 0), 0) || 0
      return bSize - aSize
    })
  }

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
          .slice(0, 10)

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
          .slice(0, 10)

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
        // Get category ID from name
        const category = categories.find(c => c.name === selectedCategory)
        if (!category) {
          setCategoryTransactions([])
          setLoadingCategory(false)
          return
        }

        const { data: transactions } = await supabase
          .from('transactions')
          .select('id, date, amount, direction, normalized_vendor, raw_vendor, categories(name)')
          .eq('category_id', category.id)
          .gte('date', dateParams.start)
          .lte('date', dateParams.end)
          .eq('is_transfer', false)
          .eq('direction', 'debit')
          .order('date', { ascending: false })

        setCategoryTransactions(transactions || [])
      } catch (error) {
        console.error('Error fetching category transactions:', error)
      } finally {
        setLoadingCategory(false)
      }
    }

    fetchCategoryTransactions()
  }, [selectedCategory, dateRange, customMonth, categories])

  // Fetch category trend data when selected
  useEffect(() => {
    const fetchCategoryTrend = async () => {
      if (!selectedCategory) {
        setCategoryTrendData([])
        return
      }

      setLoadingCategoryTrend(true)

      try {
        // Use the same date range as the transaction list
        const dateParams = getDateRangeParams()

        // Convert to first day of month for monthly_summary query
        const startMonth = `${dateParams.start.substring(0, 7)}-01`
        const endMonth = `${dateParams.end.substring(0, 7)}-01`

        const { data: monthlySummary } = await supabase
          .from('monthly_summary')
          .select('month, category_name, expenses_cents')
          .eq('category_name', selectedCategory)
          .gte('month', startMonth)
          .lte('month', endMonth)
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
  }, [selectedCategory, dateRange, customMonth])

  // Build treemap when categories or date range changes
  useEffect(() => {
    const buildTreemap = async () => {
      if (categories.length === 0) return

      const dateParams = getDateRangeParams()
      if (!dateParams) return

      const { data: transactions } = await supabase
        .from('transactions')
        .select('amount, direction, category_id')
        .gte('date', dateParams.start)
        .lte('date', dateParams.end)
        .eq('is_transfer', false)
        .eq('direction', 'debit')

      if (transactions) {
        const treemap = buildTreemapData(transactions, categories)
        setTreemapData(treemap)
      }
    }

    buildTreemap()
  }, [categories, dateRange, customMonth])

  // Fetch all categories for hierarchy display and picker
  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true })

      if (data) setCategories(data)
    }

    fetchCategories()
  }, [])

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

      {/* Spending Breakdown: Treemap + Table */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">
        {/* Left: Treemap (60% on large screens) */}
        <Card className="lg:col-span-3 hover:shadow-md transition-all duration-200">
          <CardContent className="p-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-5">
              Visual Breakdown
            </h3>
            {treemapData.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p className="font-semibold">No spending data available</p>
                <p className="text-sm mt-2">Upload transactions to see your spending breakdown</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={400}>
                <Treemap
                  data={treemapData}
                  dataKey="size"
                  aspectRatio={4 / 3}
                  stroke="#fff"
                  content={<CustomTreemapContent />}
                />
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Right: Hierarchical Table (40% on large screens) */}
        <Card className="lg:col-span-2 hover:shadow-md transition-all duration-200">
          <CardContent className="p-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-5">
              Category Breakdown
            </h3>
            <CategoryHierarchyTable
              treemapData={treemapData}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
            />
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

      {/* Category Picker Dialog */}
      {showCategoryPicker && (
        <Dialog open={showCategoryPicker} onOpenChange={setShowCategoryPicker}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Select Category</DialogTitle>
            </DialogHeader>

            <div className="space-y-2">
              <Label>Choose a category to view spending</Label>
              <Select
                value=""
                onValueChange={(value) => {
                  setSelectedCategory(value)
                  setShowCategoryPicker(false)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category..." />
                </SelectTrigger>
                <SelectContent>
                  {buildCategorySelectOptions(categories)}
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="outline"
              onClick={() => setShowCategoryPicker(false)}
              className="mt-4"
            >
              Cancel
            </Button>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
