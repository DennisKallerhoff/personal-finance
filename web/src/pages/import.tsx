import { useState, useRef, useEffect } from 'react'
import { Upload, AlertTriangle, CheckCircle, Trash2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { supabase, type Account, type ImportJob } from '@/lib/supabase'
import type { Json } from '@/types/database'
import { useAuth } from '@/hooks/use-auth'

// Compute SHA-256 hash of file for duplicate detection
async function computeFileHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
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
        Drag & Drop PDF files here
      </p>
      <p className="text-muted-foreground mt-3 m-0">
        or click to browse files
      </p>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={(e) => e.target.files && onFilesSelected(e.target.files)}
      />
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'completed') {
    return (
      <span className="inline-flex text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-[var(--success-light)] text-[#166534]">
        Success
      </span>
    )
  }
  if (status === 'processing') {
    return (
      <span className="inline-flex text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-[var(--warning-light)] text-[#92400e]">
        Processing
      </span>
    )
  }
  if (status === 'failed') {
    return (
      <span className="inline-flex text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-[var(--destructive-light)] text-[#991b1b]">
        Failed
      </span>
    )
  }
  return (
    <span className="inline-flex text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-muted text-muted-foreground">
      {status}
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

interface ImportJobWithAccount extends ImportJob {
  accounts?: { name: string } | null
}

// Format date for display
function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export default function Import() {
  const { user } = useAuth()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [parseResult, setParseResult] = useState<ParseResult | null>(null)
  const [importSuccess, setImportSuccess] = useState(false)
  const [importHistory, setImportHistory] = useState<ImportJobWithAccount[]>([])
  const [selectedImport, setSelectedImport] = useState<ImportJobWithAccount | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Fetch accounts and import history on mount
  useEffect(() => {
    const fetchData = async () => {
      // Fetch accounts
      const { data: accountsData } = await supabase
        .from('accounts')
        .select('*')
        .eq('is_active', true)
        .order('name')

      if (accountsData) {
        setAccounts(accountsData)
        if (accountsData.length > 0) {
          setSelectedAccountId(accountsData[0].id)
        }
      }

      // Fetch import history
      await fetchImportHistory()
    }
    fetchData()
  }, [])

  const fetchImportHistory = async () => {
    const { data } = await supabase
      .from('import_jobs')
      .select('*, accounts(name)')
      .order('created_at', { ascending: false })
      .limit(20)

    if (data) {
      setImportHistory(data as ImportJobWithAccount[])
    }
  }

  const handleFilesSelected = async (files: FileList) => {
    const file = files[0]
    if (!file) return

    if (!user) {
      setError('You must be logged in to import files')
      return
    }

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
      // Check for duplicate file before uploading
      const fileHash = await computeFileHash(file)
      const { data: existingImport } = await supabase
        .from('import_jobs')
        .select('id, filename, created_at')
        .eq('file_hash', fileHash)
        .maybeSingle()

      if (existingImport) {
        const importDate = new Date(existingImport.created_at || '').toLocaleDateString('de-DE')
        setError(`This file was already imported on ${importDate} as "${existingImport.filename}". Skipping duplicate upload.`)
        setLoading(false)
        return
      }

      // Upload to Edge Function
      const formData = new FormData()
      formData.append('file', file)

      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError || !session) {
        throw new Error('You must be logged in to import files')
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-pdf`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: formData,
        }
      )

      const result = await response.json() as ParseResult

      if (!result.success) {
        throw new Error(result.error || 'Import failed')
      }

      setParseResult(result)

      // Auto-save transactions to database (reuse fileHash computed earlier)
      if (result.transactions && result.transactions.length > 0) {
        await saveTransactions(result.transactions, file.name, fileHash, result.warnings || [])
        setImportSuccess(true)
        // Refresh import history
        await fetchImportHistory()
      }

    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const saveTransactions = async (
    transactions: ParsedTransaction[],
    filename: string,
    fileHash: string,
    warnings: Array<{ line: number; message: string; raw: string }>
  ) => {
    // Create import job
    const { data: importJob, error: jobError } = await supabase
      .from('import_jobs')
      .insert({
        filename,
        account_id: selectedAccountId,
        status: 'processing',
        transactions_count: 0,  // Will be updated after processing
        file_hash: fileHash,
        errors: [],
        warnings: warnings
      })
      .select()
      .single()

    if (jobError) throw jobError

    // Process transactions with classification, deduplication, and transfer detection
    const { data: stats, error: importError } = await supabase
      .rpc('import_transactions_batch', {
        p_account_id: selectedAccountId,
        p_import_job_id: importJob.id,
        p_transactions: transactions as unknown as Json
      })

    if (importError) throw importError

    // Update import job with final statistics
    const result = stats?.[0]
    await supabase
      .from('import_jobs')
      .update({
        status: 'completed',
        transactions_count: result?.inserted_count || 0,
        duplicates_count: result?.duplicate_count || 0
      })
      .eq('id', importJob.id)

    // Classify unknown vendors with LLM
    await classifyUnknownTransactions(importJob.id)
  }

  const classifyUnknownTransactions = async (importJobId: string) => {
    // Fetch transactions with null category_id from this import
    const { data: unclassified } = await supabase
      .from('transactions')
      .select('id, raw_vendor, normalized_vendor, description, amount, direction')
      .eq('import_job_id', importJobId)
      .is('category_id', null)

    if (!unclassified || unclassified.length === 0) {
      return  // All transactions were classified by rules
    }

    console.log(`Classifying ${unclassified.length} unknown vendors with LLM...`)

    // Get session for auth
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    // Call LLM classifier for each unknown transaction
    const classificationPromises = unclassified.map(async (tx) => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/classify-transaction`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              transaction_id: tx.id,
              raw_vendor: tx.raw_vendor,
              normalized_vendor: tx.normalized_vendor,
              description: tx.description,
              amount: tx.amount,
              direction: tx.direction,
            }),
          }
        )

        const result = await response.json()
        return result
      } catch (e) {
        console.error('LLM classification failed for', tx.normalized_vendor, e)
        return { success: false }
      }
    })

    // Wait for all classifications to complete
    await Promise.all(classificationPromises)

    console.log('LLM classification complete')
  }

  const handleDeleteImport = async (importId: string) => {
    if (!confirm('Delete this import and all associated transactions?')) {
      return
    }

    setDeletingId(importId)
    setError(null)

    try {
      // Delete transactions first (they have FK to import_jobs)
      const { error: txError } = await supabase
        .from('transactions')
        .delete()
        .eq('import_job_id', importId)

      if (txError) throw txError

      // Delete import job
      const { error: jobError } = await supabase
        .from('import_jobs')
        .delete()
        .eq('id', importId)

      if (jobError) throw jobError

      // Refresh history
      await fetchImportHistory()
      setSelectedImport(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete import')
    } finally {
      setDeletingId(null)
    }
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
          {importHistory.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No imports yet. Upload a PDF to get started.
            </p>
          ) : (
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
                {importHistory.map((imp) => (
                  <tr
                    key={imp.id}
                    className="hover:bg-[#fafafa]"
                  >
                    <td className="py-4 border-b border-border font-medium">
                      {formatDate(imp.created_at || '')}
                    </td>
                    <td className="py-4 border-b border-border font-semibold">{imp.filename}</td>
                    <td className="py-4 border-b border-border">{imp.accounts?.name || '-'}</td>
                    <td className="py-4 border-b border-border text-right font-heading font-semibold">
                      {imp.transactions_count}
                    </td>
                    <td className="py-4 border-b border-border">
                      <StatusBadge status={imp.status} />
                    </td>
                    <td className="py-4 border-b border-border text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedImport(imp)}
                        >
                          Details
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive border-[var(--destructive-light)] hover:bg-[var(--destructive-light)]"
                          onClick={() => handleDeleteImport(imp.id)}
                          disabled={deletingId === imp.id}
                        >
                          {deletingId === imp.id ? (
                            <div className="animate-spin h-4 w-4 border-2 border-destructive border-t-transparent rounded-full" />
                          ) : (
                            <Trash2 size={16} />
                          )}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Selected Import Details */}
      {selectedImport && (
        <Card className={`border-l-[6px] ${
          (selectedImport.warnings as any[])?.length > 0
            ? 'border-l-[var(--warning)]'
            : 'border-l-[#4CAF50]'
        }`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground m-0">
                Import Details: {selectedImport.filename}
              </h3>
              <Button variant="outline" size="sm" onClick={() => setSelectedImport(null)}>
                Close
              </Button>
            </div>

            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="bg-muted rounded-lg p-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Status
                </div>
                <div className="mt-2">
                  <StatusBadge status={selectedImport.status} />
                </div>
              </div>
              <div className="bg-muted rounded-lg p-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Transactions
                </div>
                <div className="font-heading font-bold text-2xl mt-1">
                  {selectedImport.transactions_count}
                </div>
              </div>
              <div className="bg-muted rounded-lg p-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Duplicates
                </div>
                <div className="font-heading font-bold text-2xl mt-1">
                  {selectedImport.duplicates_count || 0}
                </div>
              </div>
              <div className="bg-muted rounded-lg p-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Account
                </div>
                <div className="font-heading font-bold text-lg mt-1">
                  {selectedImport.accounts?.name || '-'}
                </div>
              </div>
            </div>

            {/* Warnings */}
            {(selectedImport.warnings as any[])?.length > 0 && (
              <div className="bg-[var(--warning-light)] rounded-lg p-6 mb-4">
                <h4 className="flex items-center gap-2 font-heading font-bold text-[#92400e] m-0 mb-3">
                  <AlertTriangle size={20} />
                  {(selectedImport.warnings as any[]).length} Warning{(selectedImport.warnings as any[]).length > 1 ? 's' : ''}
                </h4>
                <ul className="m-0 pl-6 text-[#92400e] font-medium space-y-2 text-sm">
                  {(selectedImport.warnings as any[]).map((warning: any, i: number) => (
                    <li key={i}>
                      {warning.line ? `Line ${warning.line}: ` : ''}{warning.message || String(warning)}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Errors */}
            {(selectedImport.errors as any[])?.length > 0 && (
              <div className="bg-[var(--destructive-light)] rounded-lg p-6">
                <h4 className="flex items-center gap-2 font-heading font-bold text-[#991b1b] m-0 mb-3">
                  <AlertTriangle size={20} />
                  {(selectedImport.errors as any[]).length} Error{(selectedImport.errors as any[]).length > 1 ? 's' : ''}
                </h4>
                <ul className="m-0 pl-6 text-[#991b1b] font-medium space-y-2 text-sm">
                  {(selectedImport.errors as any[]).map((error: any, i: number) => (
                    <li key={i}>{String(error)}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Import Metadata */}
            {selectedImport.metadata && Object.keys(selectedImport.metadata as object).length > 0 && (
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  Metadata
                </h4>
                <pre className="text-sm text-muted-foreground m-0">
                  {JSON.stringify(selectedImport.metadata, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
