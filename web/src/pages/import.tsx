import { useState, useRef, useEffect } from 'react'
import { Upload, AlertTriangle, CheckCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { supabase, type Account, type TransactionInsert } from '@/lib/supabase'

// Mock data - will be replaced with real data from Supabase
const MOCK_IMPORTS = [
  {
    id: '1',
    date: 'Oct 31, 10:30 AM',
    filename: 'ING_Account_Oct23.pdf',
    account: 'ING Main',
    type: 'PDF',
    txns: 45,
    status: 'success' as const,
  },
  {
    id: '2',
    date: 'Oct 30, 09:15 AM',
    filename: 'Visa_Statement_Oct23.pdf',
    account: 'Credit Card',
    type: 'PDF',
    txns: 22,
    status: 'partial' as const,
    warningCount: 2,
  },
  {
    id: '3',
    date: 'Sep 30, 11:00 AM',
    filename: 'old_export.csv',
    account: 'ING Main',
    type: 'CSV',
    txns: 150,
    status: 'success' as const,
  },
]

const MOCK_REPORT = {
  filename: 'Visa_Statement_Oct23.pdf',
  pagesParsed: 3,
  rawLines: 128,
  validTransactions: 22,
  warnings: [
    'Page 2: Date parsing ambiguity on line 45 ("2023-10-??"). Manual review required.',
    'Page 3: Vendor name missing for transaction amount € 12.50. Defaulted to "Unknown Vendor".',
  ],
}

function DropZone({ onFilesSelected }: { onFilesSelected: (files: FileList) => void }) {
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDragIn = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragOut = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesSelected(e.dataTransfer.files)
    }
  }

  return (
    <div
      onClick={() => fileInputRef.current?.click()}
      onDragEnter={handleDragIn}
      onDragLeave={handleDragOut}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      className={`border-[3px] border-dashed rounded-2xl p-16 text-center cursor-pointer transition-all ${
        isDragging
          ? 'border-primary bg-[#d1fae5] scale-[1.01]'
          : 'border-primary bg-[var(--primary-light)] hover:bg-[#d1fae5] hover:scale-[1.01]'
      }`}
    >
      <Upload
        size={64}
        className="mx-auto mb-6 text-primary"
        strokeWidth={1.5}
      />
      <p className="font-heading font-bold text-xl text-primary m-0">
        Drag & Drop PDF or CSV files here
      </p>
      <p className="text-muted-foreground mt-3 m-0">
        or click to browse files
      </p>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.csv"
        className="hidden"
        onChange={(e) => e.target.files && onFilesSelected(e.target.files)}
      />
    </div>
  )
}

function StatusBadge({ status, warningCount }: { status: 'success' | 'partial' | 'error'; warningCount?: number }) {
  if (status === 'success') {
    return (
      <span className="inline-flex text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-[var(--success-light)] text-[#166534]">
        Success
      </span>
    )
  }
  if (status === 'partial') {
    return (
      <span className="inline-flex text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-[var(--warning-light)] text-[#92400e]">
        Partial
      </span>
    )
  }
  return (
    <span className="inline-flex text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-[var(--destructive-light)] text-[#991b1b]">
      Error
    </span>
  )
}

function TypeBadge({ type }: { type: string }) {
  return (
    <span className="inline-flex text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-muted text-muted-foreground">
      {type}
    </span>
  )
}

interface ParsedTransaction {
  date: string
  amount: number
  direction: 'debit' | 'credit'
  raw_vendor: string
  description: string
  type?: string
  metadata?: Record<string, string>
}

interface ParseResult {
  success: boolean
  filename?: string
  transactions?: ParsedTransaction[]
  warnings?: Array<{ line: number; message: string; raw: string }>
  metadata?: {
    bank: 'ing' | 'dkb'
    pages_parsed: number
    raw_lines: number
  }
  error?: string
}

export default function Import() {
  const [showReport, setShowReport] = useState(true)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [parseResult, setParseResult] = useState<ParseResult | null>(null)
  const [importSuccess, setImportSuccess] = useState(false)

  // Fetch accounts on mount
  useEffect(() => {
    const fetchAccounts = async () => {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('is_active', true)
        .order('name')

      if (data && !error) {
        setAccounts(data)
        if (data.length > 0) {
          setSelectedAccountId(data[0].id)
        }
      }
    }
    fetchAccounts()
  }, [])

  const handleFilesSelected = async (files: FileList) => {
    const file = files[0]
    if (!file) return

    if (!selectedAccountId) {
      setError('Please select an account first')
      return
    }

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Only PDF files are supported')
      return
    }

    // Validate file size (10 MB limit)
    const MAX_FILE_SIZE = 10 * 1024 * 1024
    if (file.size > MAX_FILE_SIZE) {
      setError('File too large. Maximum size is 10 MB.')
      return
    }

    setLoading(true)
    setError(null)
    setParseResult(null)
    setImportSuccess(false)

    try {
      // Upload to Edge Function
      const formData = new FormData()
      formData.append('file', file)

      const { data: session } = await supabase.auth.getSession()

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-pdf`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.session?.access_token}`,
          },
          body: formData,
        }
      )

      const result = await response.json() as ParseResult

      if (!result.success) {
        throw new Error(result.error || 'Import failed')
      }

      setParseResult(result)

      // Auto-save transactions to database
      if (result.transactions && result.transactions.length > 0) {
        await saveTransactions(result.transactions, file.name)
        setImportSuccess(true)
      }

    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const saveTransactions = async (transactions: ParsedTransaction[], filename: string) => {
    // Create import job
    const { data: importJob, error: jobError } = await supabase
      .from('import_jobs')
      .insert({
        filename,
        account_id: selectedAccountId,
        status: 'completed',
        transactions_count: transactions.length,
        file_hash: '', // TODO: Compute file hash
        errors: [],
        warnings: parseResult?.warnings || []
      })
      .select()
      .single()

    if (jobError) throw jobError

    // Insert transactions
    const transactionsToInsert: TransactionInsert[] = transactions.map(tx => ({
      account_id: selectedAccountId,
      import_job_id: importJob.id,
      date: tx.date,
      amount: tx.amount,
      direction: tx.direction,
      raw_vendor: tx.raw_vendor,
      description: tx.description,
      // Category classification will be handled in Phase 4
      category_id: null,
      confidence: null,
      is_transfer: false,
      is_reviewed: false,
    }))

    const { error: txError } = await supabase
      .from('transactions')
      .insert(transactionsToInsert)

    if (txError) throw txError
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-bold m-0">Import Management</h2>
      </div>

      {/* Account Selection */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <label className="block mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Account
            </span>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="mt-2 w-full px-4 py-3 border-2 border-border rounded-lg font-medium focus:outline-none focus:border-primary transition-colors"
            >
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </label>
        </CardContent>
      </Card>

      {/* Upload Section */}
      <div className="mb-6">
        {loading ? (
          <Card>
            <CardContent className="p-16 text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mx-auto mb-4"></div>
              <p className="font-heading font-bold text-xl text-primary">Processing PDF...</p>
              <p className="text-muted-foreground mt-2">Extracting transactions</p>
            </CardContent>
          </Card>
        ) : (
          <DropZone onFilesSelected={handleFilesSelected} />
        )}
      </div>

      {/* Error Message */}
      {error && (
        <Card className="mb-6 border-l-[6px] border-l-destructive">
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="text-destructive" size={24} />
              <p className="font-semibold text-destructive m-0">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Success Message */}
      {importSuccess && parseResult && (
        <Card className="mb-6 border-l-[6px] border-l-[#4CAF50]">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="text-[#4CAF50]" size={32} />
              <div>
                <h3 className="font-heading font-bold text-xl m-0">Import Successful!</h3>
                <p className="text-muted-foreground m-0 mt-1">
                  {parseResult.transactions?.length} transactions imported from {parseResult.filename}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-muted rounded-lg p-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Bank
                </div>
                <div className="font-heading font-bold text-2xl mt-1 uppercase">
                  {parseResult.metadata?.bank}
                </div>
              </div>
              <div className="bg-muted rounded-lg p-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Pages Parsed
                </div>
                <div className="font-heading font-bold text-2xl mt-1">
                  {parseResult.metadata?.pages_parsed}
                </div>
              </div>
              <div className="bg-muted rounded-lg p-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Transactions
                </div>
                <div className="font-heading font-bold text-2xl mt-1">
                  {parseResult.transactions?.length}
                </div>
              </div>
            </div>

            {parseResult.warnings && parseResult.warnings.length > 0 && (
              <div className="bg-[var(--warning-light)] rounded-lg p-4">
                <h4 className="flex items-center gap-2 font-heading font-bold text-[#92400e] m-0 mb-2">
                  <AlertTriangle size={20} />
                  {parseResult.warnings.length} Warning{parseResult.warnings.length > 1 ? 's' : ''}
                </h4>
                <ul className="m-0 pl-6 text-[#92400e] font-medium space-y-1 text-sm">
                  {parseResult.warnings.slice(0, 5).map((warning, i) => (
                    <li key={i}>Line {warning.line}: {warning.message}</li>
                  ))}
                  {parseResult.warnings.length > 5 && (
                    <li>...and {parseResult.warnings.length - 5} more</li>
                  )}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Import History */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-5">
            Import History
          </h3>
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground pb-4 border-b-2 border-border">
                  Date
                </th>
                <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground pb-4 border-b-2 border-border">
                  Filename
                </th>
                <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground pb-4 border-b-2 border-border">
                  Account
                </th>
                <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground pb-4 border-b-2 border-border">
                  Type
                </th>
                <th className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground pb-4 border-b-2 border-border">
                  Txns
                </th>
                <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground pb-4 border-b-2 border-border">
                  Status
                </th>
                <th className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground pb-4 border-b-2 border-border">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {MOCK_IMPORTS.map((imp) => (
                <tr
                  key={imp.id}
                  className={`hover:bg-[#fafafa] ${imp.status === 'partial' ? 'bg-[var(--warning-light)]' : ''}`}
                >
                  <td className="py-4 border-b border-border font-medium">{imp.date}</td>
                  <td className="py-4 border-b border-border font-semibold">{imp.filename}</td>
                  <td className="py-4 border-b border-border">{imp.account}</td>
                  <td className="py-4 border-b border-border">
                    <TypeBadge type={imp.type} />
                  </td>
                  <td className="py-4 border-b border-border text-right font-heading font-semibold">
                    {imp.txns}
                  </td>
                  <td className="py-4 border-b border-border">
                    <StatusBadge status={imp.status} warningCount={imp.warningCount} />
                  </td>
                  <td className="py-4 border-b border-border text-right">
                    <div className="flex gap-2 justify-end">
                      {imp.status === 'partial' ? (
                        <>
                          <Button size="sm">
                            Review ({imp.warningCount})
                          </Button>
                          <Button variant="outline" size="sm">
                            Reprocess
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button variant="outline" size="sm">
                            Details
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive border-[var(--destructive-light)] hover:bg-[var(--destructive-light)]"
                          >
                            Delete
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Detailed Import Report */}
      {showReport && (
        <Card className="border-l-[6px] border-l-[var(--warning)]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground m-0">
                Report: {MOCK_REPORT.filename}
              </h3>
              <span className="text-sm font-bold px-3 py-1 rounded-full bg-[var(--warning-light)] text-[#92400e]">
                Completed with Warnings
              </span>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-muted rounded-lg p-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Pages Parsed
                </div>
                <div className="font-heading font-bold text-2xl mt-1">
                  {MOCK_REPORT.pagesParsed}
                </div>
              </div>
              <div className="bg-muted rounded-lg p-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Raw Lines
                </div>
                <div className="font-heading font-bold text-2xl mt-1">
                  {MOCK_REPORT.rawLines}
                </div>
              </div>
              <div className="bg-muted rounded-lg p-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Valid Transactions
                </div>
                <div className="font-heading font-bold text-2xl mt-1">
                  {MOCK_REPORT.validTransactions}
                </div>
              </div>
            </div>

            <div className="bg-[var(--warning-light)] rounded-lg p-6">
              <h4 className="flex items-center gap-2 font-heading font-bold text-[#92400e] m-0 mb-3">
                <AlertTriangle size={20} />
                Warnings
              </h4>
              <ul className="m-0 pl-6 text-[#92400e] font-medium space-y-2">
                {MOCK_REPORT.warnings.map((warning, i) => (
                  <li key={i}>{warning}</li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
