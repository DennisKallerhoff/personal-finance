import { useState } from 'react'
import { Link } from 'react-router'
import { ChevronLeft, ChevronRight, Upload, AlertTriangle, Bell, TrendingUp } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

// Mock data - will be replaced with real data from Supabase
const MOCK_DATA = {
  expenses: 2450.0,
  income: 3200.0,
  netBalance: 750.0,
  expensesTrend: 12,
  topCategories: [
    { name: 'Groceries', amount: 450.0, change: 5 },
    { name: 'Rent/Utilities', amount: 1200.0, change: 0 },
    { name: 'Dining Out', amount: 250.0, change: 15 },
    { name: 'Transport', amount: 120.0, change: -10 },
  ],
  recentImports: [
    { filename: 'ING_Account_Oct23.pdf', date: 'Imported today', txns: 45, status: 'success' },
    { filename: 'Visa_Statement_Oct23.pdf', date: 'Imported yesterday', txns: 22, status: 'warning', warnings: 2 },
  ],
  signals: [
    { type: 'trend', title: 'Trend Increase: Dining Out', description: 'Category has increased >15% over the last 3 months.' },
    { type: 'subscription', title: 'New Subscription Detected', description: '"Netflix" appears monthly (± 3 days) for the last 3 months.' },
    { type: 'large', title: 'Large One-off Expense', description: 'Transaction of € 450.00 at "Apple Store" detected.' },
  ],
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount)
}

function TrendBadge({ change }: { change: number }) {
  if (change > 0) {
    return (
      <span className="inline-flex items-center gap-1 text-sm font-semibold px-2 py-0.5 rounded bg-[var(--destructive-light)] text-[#991b1b]">
        +{change}%
      </span>
    )
  }
  if (change < 0) {
    return (
      <span className="inline-flex items-center gap-1 text-sm font-semibold px-2 py-0.5 rounded bg-[var(--success-light)] text-[#166534]">
        {change}%
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-sm font-semibold px-2 py-0.5 rounded bg-muted text-muted-foreground">
      0%
    </span>
  )
}

function MetricCard({ label, value, trend, valueColor }: { label: string; value: string; trend?: number; valueColor?: string }) {
  return (
    <Card className="relative overflow-hidden">
      <div className="absolute top-0 left-0 w-1 h-full bg-primary opacity-50" />
      <CardContent className="p-6">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span className={`block font-heading text-4xl font-bold mt-1 ${valueColor || ''}`}>
          {value}
        </span>
        {trend !== undefined && (
          <div className="mt-2">
            <span className={`inline-flex items-center gap-1 text-sm font-semibold px-2 py-0.5 rounded ${
              trend > 0
                ? 'bg-[var(--destructive-light)] text-[#991b1b]'
                : trend < 0
                  ? 'bg-[var(--success-light)] text-[#166534]'
                  : 'bg-muted text-muted-foreground'
            }`}>
              {trend > 0 ? '▲' : trend < 0 ? '▼' : '—'} {Math.abs(trend)}%
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function SimpleLineChart() {
  return (
    <div className="h-[200px] relative pb-6">
      <svg className="w-full h-full" viewBox="0 0 300 150" preserveAspectRatio="none">
        <defs>
          <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.2" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d="M0,150 L0,100 L50,110 L100,80 L150,90 L200,60 L250,70 L300,150 Z"
          fill="url(#chartGradient)"
        />
        <path
          d="M0,100 L50,110 L100,80 L150,90 L200,60 L250,70"
          fill="none"
          stroke="var(--primary)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {[
          { x: 0, y: 100 },
          { x: 50, y: 110 },
          { x: 100, y: 80 },
          { x: 150, y: 90 },
          { x: 200, y: 60 },
          { x: 250, y: 70 },
        ].map((point, i) => (
          <circle
            key={i}
            cx={point.x}
            cy={point.y}
            r="4"
            fill="white"
            stroke="var(--primary)"
            strokeWidth="2"
          />
        ))}
      </svg>
      <div className="absolute bottom-0 w-full flex justify-between text-xs text-muted-foreground font-medium px-2">
        <span>May</span>
        <span>Jun</span>
        <span>Jul</span>
        <span>Aug</span>
        <span>Sep</span>
        <span>Oct</span>
      </div>
    </div>
  )
}

function BarChart() {
  const data = [
    { month: 'Jun', rent: 40, groceries: 30, dining: 20 },
    { month: 'Jul', rent: 45, groceries: 25, dining: 25 },
    { month: 'Aug', rent: 35, groceries: 35, dining: 15 },
    { month: 'Sep', rent: 50, groceries: 30, dining: 20 },
    { month: 'Oct', rent: 42, groceries: 28, dining: 22 },
  ]

  return (
    <div className="h-[300px]">
      <div className="h-full flex items-end gap-3 pb-8">
        {data.map((item, i) => (
          <div key={i} className="flex-1 flex flex-col items-center justify-end h-full gap-1">
            <div className="w-full rounded-t" style={{ height: `${item.dining}%`, backgroundColor: '#f59e0b' }} />
            <div className="w-full" style={{ height: `${item.groceries}%`, backgroundColor: 'var(--primary)' }} />
            <div className="w-full rounded-t" style={{ height: `${item.rent}%`, backgroundColor: '#0ea5e9' }} />
            <span className={`text-xs font-semibold mt-2 ${i === data.length - 1 ? 'text-secondary' : 'text-muted-foreground'}`}>
              {item.month}
            </span>
          </div>
        ))}
      </div>
      <div className="flex justify-center gap-5 mt-4">
        <div className="flex items-center gap-2 text-sm">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#0ea5e9' }} />
          Rent
        </div>
        <div className="flex items-center gap-2 text-sm">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'var(--primary)' }} />
          Groceries
        </div>
        <div className="flex items-center gap-2 text-sm">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#f59e0b' }} />
          Dining
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<'overview' | 'trends' | 'signals'>('overview')
  const [currentMonth, setCurrentMonth] = useState('October 2023')

  return (
    <div>
      {/* Month Selector + Upload Button */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            className="rounded-full w-9 h-9"
            onClick={() => setCurrentMonth('September 2023')}
          >
            <ChevronLeft size={18} />
          </Button>
          <h2 className="text-3xl font-bold m-0">{currentMonth}</h2>
          <Button
            variant="outline"
            size="icon"
            className="rounded-full w-9 h-9"
            onClick={() => setCurrentMonth('November 2023')}
          >
            <ChevronRight size={18} />
          </Button>
        </div>
        <Link to="/import">
          <Button className="gap-2">
            <Upload size={18} />
            Upload Statement
          </Button>
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b-2 border-border mb-6">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-6 py-3 font-heading text-lg font-semibold border-b-[3px] -mb-[2px] transition-colors ${
            activeTab === 'overview'
              ? 'text-secondary border-primary'
              : 'text-muted-foreground border-transparent hover:text-secondary'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('trends')}
          className={`px-6 py-3 font-heading text-lg font-semibold border-b-[3px] -mb-[2px] transition-colors ${
            activeTab === 'trends'
              ? 'text-secondary border-primary'
              : 'text-muted-foreground border-transparent hover:text-secondary'
          }`}
        >
          Trends
        </button>
        <button
          onClick={() => setActiveTab('signals')}
          className={`px-6 py-3 font-heading text-lg font-semibold border-b-[3px] -mb-[2px] transition-colors flex items-center gap-2 ${
            activeTab === 'signals'
              ? 'text-secondary border-primary'
              : 'text-muted-foreground border-transparent hover:text-secondary'
          }`}
        >
          Signals
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[var(--warning-light)] text-[#92400e]">
            {MOCK_DATA.signals.length}
          </span>
        </button>
      </div>

      {/* Tab Content: Overview */}
      {activeTab === 'overview' && (
        <div className="animate-in fade-in duration-300">
          {/* Key Metrics */}
          <div className="grid grid-cols-3 gap-6 mb-6">
            <MetricCard
              label="Expenses"
              value={formatCurrency(MOCK_DATA.expenses)}
              trend={MOCK_DATA.expensesTrend}
            />
            <MetricCard
              label="Income"
              value={formatCurrency(MOCK_DATA.income)}
              trend={0}
            />
            <MetricCard
              label="Net Balance"
              value={`+ ${formatCurrency(MOCK_DATA.netBalance)}`}
              valueColor="text-[var(--success)]"
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* Mini Trend Chart */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-5">
                  6-Month Trend
                </h3>
                <SimpleLineChart />
              </CardContent>
            </Card>

            {/* Top Categories */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-5">
                  Top Categories
                </h3>
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground pb-3 border-b-2 border-border">
                        Category
                      </th>
                      <th className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground pb-3 border-b-2 border-border">
                        Amount
                      </th>
                      <th className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground pb-3 border-b-2 border-border">
                        Change
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {MOCK_DATA.topCategories.map((cat) => (
                      <tr key={cat.name} className="hover:bg-[#fafafa]">
                        <td className="py-4 border-b border-border">{cat.name}</td>
                        <td className="py-4 border-b border-border text-right font-heading font-semibold">
                          {formatCurrency(cat.amount)}
                        </td>
                        <td className="py-4 border-b border-border text-right">
                          <TrendBadge change={cat.change} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>

          {/* Recent Imports */}
          <Card className="mt-6">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground m-0">
                  Recent Imports
                </h3>
                <Link to="/import" className="text-sm font-semibold text-primary hover:text-[var(--primary-dark)]">
                  View All &rarr;
                </Link>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {MOCK_DATA.recentImports.map((imp) => (
                  <div key={imp.filename} className="border-2 border-border rounded-lg p-4">
                    <div className="font-bold mb-1">{imp.filename}</div>
                    <div className="text-sm text-muted-foreground mb-2">
                      {imp.date} &bull; {imp.txns} txns
                    </div>
                    <span className={`inline-flex text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-full ${
                      imp.status === 'success'
                        ? 'bg-[var(--success-light)] text-[#166534]'
                        : 'bg-[var(--warning-light)] text-[#92400e]'
                    }`}>
                      {imp.status === 'success' ? 'Success' : `${imp.warnings} Warnings`}
                    </span>
                  </div>
                ))}
                <Link
                  to="/import"
                  className="border-2 border-dashed border-primary bg-[var(--primary-light)] rounded-lg p-4 flex items-center justify-center text-primary font-bold hover:bg-[#d1fae5] transition-colors"
                >
                  + Upload New
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab Content: Trends */}
      {activeTab === 'trends' && (
        <div className="animate-in fade-in duration-300">
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground m-0">
                  Monthly Total Spend (12 Months)
                </h3>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer">
                    <input type="checkbox" defaultChecked className="accent-primary" />
                    Rolling 3-month avg
                  </label>
                  <select className="px-3 py-1.5 border-2 border-border rounded-lg text-sm bg-[#fafafa] focus:border-primary focus:bg-white outline-none">
                    <option>All Categories</option>
                    <option>Groceries</option>
                    <option>Rent</option>
                  </select>
                </div>
              </div>
              <div className="h-[300px] relative pb-8">
                <svg className="w-full h-full" viewBox="0 0 800 200" preserveAspectRatio="none">
                  <line x1="0" y1="50" x2="800" y2="50" stroke="#eee" />
                  <line x1="0" y1="100" x2="800" y2="100" stroke="#eee" />
                  <line x1="0" y1="150" x2="800" y2="150" stroke="#eee" />
                  <path
                    d="M0,150 Q100,140 200,100 T400,120 T600,80 T800,90"
                    fill="none"
                    stroke="var(--primary)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {[
                    { x: 0, y: 150 },
                    { x: 200, y: 100 },
                    { x: 400, y: 120 },
                    { x: 600, y: 80 },
                    { x: 800, y: 90 },
                  ].map((point, i) => (
                    <circle
                      key={i}
                      cx={point.x}
                      cy={point.y}
                      r="4"
                      fill="white"
                      stroke="var(--primary)"
                      strokeWidth="2"
                    />
                  ))}
                </svg>
                <div className="absolute bottom-0 w-full flex justify-between text-xs text-muted-foreground font-semibold">
                  <span>Nov '22</span>
                  <span>Feb '23</span>
                  <span>May '23</span>
                  <span>Aug '23</span>
                  <span>Oct '23</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-5">
                Category Spend Over Time
              </h3>
              <BarChart />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab Content: Signals */}
      {activeTab === 'signals' && (
        <div className="animate-in fade-in duration-300 space-y-4">
          {/* Trend Warning */}
          <Card className="border-l-[6px] border-l-[var(--warning)]">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="w-12 h-12 rounded-full bg-[var(--warning-light)] text-[var(--warning)] flex items-center justify-center">
                    <AlertTriangle size={24} />
                  </div>
                  <div>
                    <h4 className="font-heading font-bold text-lg m-0">Trend Increase: Dining Out</h4>
                    <p className="text-muted-foreground mt-1 m-0">
                      Category has increased <strong className="text-destructive">&gt;15%</strong> over the last 3 months.
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm">View Details</Button>
              </div>
            </CardContent>
          </Card>

          {/* Subscription */}
          <Card className="border-l-[6px] border-l-primary">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="w-12 h-12 rounded-full bg-[var(--primary-light)] text-primary flex items-center justify-center">
                    <Bell size={24} />
                  </div>
                  <div>
                    <h4 className="font-heading font-bold text-lg m-0">New Subscription Detected</h4>
                    <p className="text-muted-foreground mt-1 m-0">
                      "Netflix" appears monthly (&plusmn; 3 days) for the last 3 months.
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm">View Details</Button>
              </div>
            </CardContent>
          </Card>

          {/* Large Expense */}
          <Card className="border-l-[6px] border-l-destructive">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="w-12 h-12 rounded-full bg-[var(--destructive-light)] text-destructive flex items-center justify-center">
                    <TrendingUp size={24} />
                  </div>
                  <div>
                    <h4 className="font-heading font-bold text-lg m-0">Large One-off Expense</h4>
                    <p className="text-muted-foreground mt-1 m-0">
                      Transaction of <strong className="text-foreground">{formatCurrency(450)}</strong> at "Apple Store" detected.
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm">View Details</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
