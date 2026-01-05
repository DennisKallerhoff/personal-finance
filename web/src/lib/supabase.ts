import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Missing Supabase environment variables. ' +
    'Please set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in .env.local'
  )
}

export const supabase = createClient<Database>(supabaseUrl, supabaseKey)

// Type helpers for common queries
export type Account = Database['public']['Tables']['accounts']['Row']
export type Category = Database['public']['Tables']['categories']['Row']
export type Transaction = Database['public']['Tables']['transactions']['Row']
export type VendorRule = Database['public']['Tables']['vendor_rules']['Row']
export type ImportJob = Database['public']['Tables']['import_jobs']['Row']
export type Comment = Database['public']['Tables']['comments']['Row']
export type CategoryOverride = Database['public']['Tables']['category_overrides']['Row']

// Insert types
export type TransactionInsert = Database['public']['Tables']['transactions']['Insert']
export type CommentInsert = Database['public']['Tables']['comments']['Insert']

// View types
export type MonthlySummary = Database['public']['Views']['monthly_summary']['Row']
export type CategorySummary = Database['public']['Views']['category_summary']['Row']
export type NeedsReview = Database['public']['Views']['needs_review']['Row']
