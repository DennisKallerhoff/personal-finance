// Types generated from Supabase schema
// Regenerate with: supabase gen types typescript --linked > src/types/database.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      accounts: {
        Row: {
          id: string
          name: string
          type: 'checking' | 'credit_card'
          color: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          type: 'checking' | 'credit_card'
          color?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          type?: 'checking' | 'credit_card'
          color?: string | null
          is_active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          id: string
          name: string
          parent_id: string | null
          icon: string | null
          color: string | null
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          parent_id?: string | null
          icon?: string | null
          color?: string | null
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          parent_id?: string | null
          icon?: string | null
          color?: string | null
          sort_order?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'categories_parent_id_fkey'
            columns: ['parent_id']
            isOneToOne: false
            referencedRelation: 'categories'
            referencedColumns: ['id']
          }
        ]
      }
      category_overrides: {
        Row: {
          id: string
          transaction_id: string
          old_category_id: string | null
          new_category_id: string
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          transaction_id: string
          old_category_id?: string | null
          new_category_id: string
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          transaction_id?: string
          old_category_id?: string | null
          new_category_id?: string
          created_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'category_overrides_transaction_id_fkey'
            columns: ['transaction_id']
            isOneToOne: false
            referencedRelation: 'transactions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'category_overrides_old_category_id_fkey'
            columns: ['old_category_id']
            isOneToOne: false
            referencedRelation: 'categories'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'category_overrides_new_category_id_fkey'
            columns: ['new_category_id']
            isOneToOne: false
            referencedRelation: 'categories'
            referencedColumns: ['id']
          }
        ]
      }
      comments: {
        Row: {
          id: string
          transaction_id: string
          user_id: string | null
          text: string
          created_at: string
        }
        Insert: {
          id?: string
          transaction_id: string
          user_id?: string | null
          text: string
          created_at?: string
        }
        Update: {
          id?: string
          transaction_id?: string
          user_id?: string | null
          text?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'comments_transaction_id_fkey'
            columns: ['transaction_id']
            isOneToOne: false
            referencedRelation: 'transactions'
            referencedColumns: ['id']
          }
        ]
      }
      import_jobs: {
        Row: {
          id: string
          filename: string
          account_id: string
          file_hash: string
          status: 'pending' | 'processing' | 'completed' | 'failed'
          transactions_count: number
          duplicates_count: number
          errors: Json
          warnings: Json
          metadata: Json
          created_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          filename: string
          account_id: string
          file_hash: string
          status?: 'pending' | 'processing' | 'completed' | 'failed'
          transactions_count?: number
          duplicates_count?: number
          errors?: Json
          warnings?: Json
          metadata?: Json
          created_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          filename?: string
          account_id?: string
          file_hash?: string
          status?: 'pending' | 'processing' | 'completed' | 'failed'
          transactions_count?: number
          duplicates_count?: number
          errors?: Json
          warnings?: Json
          metadata?: Json
          created_at?: string
          completed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'import_jobs_account_id_fkey'
            columns: ['account_id']
            isOneToOne: false
            referencedRelation: 'accounts'
            referencedColumns: ['id']
          }
        ]
      }
      transactions: {
        Row: {
          id: string
          account_id: string
          category_id: string | null
          import_job_id: string | null
          date: string
          amount: number
          direction: 'debit' | 'credit'
          raw_vendor: string | null
          normalized_vendor: string | null
          description: string | null
          confidence: 'high' | 'medium' | 'low' | null
          is_transfer: boolean
          is_reviewed: boolean
          transfer_group_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          account_id: string
          category_id?: string | null
          import_job_id?: string | null
          date: string
          amount: number
          direction: 'debit' | 'credit'
          raw_vendor?: string | null
          normalized_vendor?: string | null
          description?: string | null
          confidence?: 'high' | 'medium' | 'low' | null
          is_transfer?: boolean
          is_reviewed?: boolean
          transfer_group_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          account_id?: string
          category_id?: string | null
          import_job_id?: string | null
          date?: string
          amount?: number
          direction?: 'debit' | 'credit'
          raw_vendor?: string | null
          normalized_vendor?: string | null
          description?: string | null
          confidence?: 'high' | 'medium' | 'low' | null
          is_transfer?: boolean
          is_reviewed?: boolean
          transfer_group_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'transactions_account_id_fkey'
            columns: ['account_id']
            isOneToOne: false
            referencedRelation: 'accounts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'transactions_category_id_fkey'
            columns: ['category_id']
            isOneToOne: false
            referencedRelation: 'categories'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'transactions_import_job_id_fkey'
            columns: ['import_job_id']
            isOneToOne: false
            referencedRelation: 'import_jobs'
            referencedColumns: ['id']
          }
        ]
      }
      vendor_rules: {
        Row: {
          id: string
          match_pattern: string
          normalized_vendor: string
          category_id: string
          match_type: 'exact' | 'contains' | 'regex'
          priority: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          match_pattern: string
          normalized_vendor: string
          category_id: string
          match_type: 'exact' | 'contains' | 'regex'
          priority?: number
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          match_pattern?: string
          normalized_vendor?: string
          category_id?: string
          match_type?: 'exact' | 'contains' | 'regex'
          priority?: number
          is_active?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'vendor_rules_category_id_fkey'
            columns: ['category_id']
            isOneToOne: false
            referencedRelation: 'categories'
            referencedColumns: ['id']
          }
        ]
      }
    }
    Views: {
      category_summary: {
        Row: {
          category_id: string | null
          category_name: string | null
          category_color: string | null
          category_icon: string | null
          parent_id: string | null
          total_expenses_cents: number | null
          total_income_cents: number | null
          transaction_count: number | null
          last_transaction_date: string | null
        }
        Relationships: []
      }
      monthly_summary: {
        Row: {
          month: string | null
          account_id: string | null
          account_name: string | null
          category_id: string | null
          category_name: string | null
          category_color: string | null
          category_icon: string | null
          expenses_cents: number | null
          income_cents: number | null
          expense_count: number | null
          income_count: number | null
        }
        Relationships: []
      }
      needs_review: {
        Row: {
          id: string | null
          account_id: string | null
          category_id: string | null
          import_job_id: string | null
          date: string | null
          amount: number | null
          direction: 'debit' | 'credit' | null
          raw_vendor: string | null
          normalized_vendor: string | null
          description: string | null
          confidence: 'high' | 'medium' | 'low' | null
          is_transfer: boolean | null
          is_reviewed: boolean | null
          transfer_group_id: string | null
          created_at: string | null
          updated_at: string | null
          account_name: string | null
          category_name: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Helper types for common use cases
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']
export type Enums<T extends keyof Database['public']['Enums']> =
  Database['public']['Enums'][T]
