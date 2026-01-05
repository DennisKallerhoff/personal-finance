export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          color: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          type: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          type: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          type?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          color: string | null
          created_at: string | null
          icon: string | null
          id: string
          name: string
          parent_id: string | null
          sort_order: number | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          name: string
          parent_id?: string | null
          sort_order?: number | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "category_summary"
            referencedColumns: ["category_id"]
          },
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "monthly_summary"
            referencedColumns: ["category_id"]
          },
        ]
      }
      category_overrides: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          new_category_id: string
          old_category_id: string | null
          transaction_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          new_category_id: string
          old_category_id?: string | null
          transaction_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          new_category_id?: string
          old_category_id?: string | null
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "category_overrides_new_category_id_fkey"
            columns: ["new_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "category_overrides_new_category_id_fkey"
            columns: ["new_category_id"]
            isOneToOne: false
            referencedRelation: "category_summary"
            referencedColumns: ["category_id"]
          },
          {
            foreignKeyName: "category_overrides_new_category_id_fkey"
            columns: ["new_category_id"]
            isOneToOne: false
            referencedRelation: "monthly_summary"
            referencedColumns: ["category_id"]
          },
          {
            foreignKeyName: "category_overrides_old_category_id_fkey"
            columns: ["old_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "category_overrides_old_category_id_fkey"
            columns: ["old_category_id"]
            isOneToOne: false
            referencedRelation: "category_summary"
            referencedColumns: ["category_id"]
          },
          {
            foreignKeyName: "category_overrides_old_category_id_fkey"
            columns: ["old_category_id"]
            isOneToOne: false
            referencedRelation: "monthly_summary"
            referencedColumns: ["category_id"]
          },
          {
            foreignKeyName: "category_overrides_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "needs_review"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "category_overrides_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          created_at: string | null
          id: string
          text: string
          transaction_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          text: string
          transaction_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          text?: string
          transaction_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comments_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "needs_review"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      import_jobs: {
        Row: {
          account_id: string
          completed_at: string | null
          created_at: string | null
          duplicates_count: number | null
          errors: Json | null
          file_hash: string
          filename: string
          id: string
          metadata: Json | null
          status: string
          transactions_count: number | null
          warnings: Json | null
        }
        Insert: {
          account_id: string
          completed_at?: string | null
          created_at?: string | null
          duplicates_count?: number | null
          errors?: Json | null
          file_hash: string
          filename: string
          id?: string
          metadata?: Json | null
          status?: string
          transactions_count?: number | null
          warnings?: Json | null
        }
        Update: {
          account_id?: string
          completed_at?: string | null
          created_at?: string | null
          duplicates_count?: number | null
          errors?: Json | null
          file_hash?: string
          filename?: string
          id?: string
          metadata?: Json | null
          status?: string
          transactions_count?: number | null
          warnings?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "import_jobs_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          account_id: string
          amount: number
          category_id: string | null
          confidence: string | null
          content_hash: string | null
          created_at: string | null
          date: string
          description: string | null
          direction: string
          id: string
          import_job_id: string | null
          is_reviewed: boolean | null
          is_transfer: boolean | null
          normalized_vendor: string | null
          raw_vendor: string | null
          transfer_group_id: string | null
          updated_at: string | null
        }
        Insert: {
          account_id: string
          amount: number
          category_id?: string | null
          confidence?: string | null
          content_hash?: string | null
          created_at?: string | null
          date: string
          description?: string | null
          direction: string
          id?: string
          import_job_id?: string | null
          is_reviewed?: boolean | null
          is_transfer?: boolean | null
          normalized_vendor?: string | null
          raw_vendor?: string | null
          transfer_group_id?: string | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          amount?: number
          category_id?: string | null
          confidence?: string | null
          content_hash?: string | null
          created_at?: string | null
          date?: string
          description?: string | null
          direction?: string
          id?: string
          import_job_id?: string | null
          is_reviewed?: boolean | null
          is_transfer?: boolean | null
          normalized_vendor?: string | null
          raw_vendor?: string | null
          transfer_group_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "category_summary"
            referencedColumns: ["category_id"]
          },
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "monthly_summary"
            referencedColumns: ["category_id"]
          },
          {
            foreignKeyName: "transactions_import_job_id_fkey"
            columns: ["import_job_id"]
            isOneToOne: false
            referencedRelation: "import_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_rules: {
        Row: {
          category_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          match_pattern: string
          match_type: string
          normalized_vendor: string
          priority: number
        }
        Insert: {
          category_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          match_pattern: string
          match_type: string
          normalized_vendor: string
          priority?: number
        }
        Update: {
          category_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          match_pattern?: string
          match_type?: string
          normalized_vendor?: string
          priority?: number
        }
        Relationships: [
          {
            foreignKeyName: "vendor_rules_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_rules_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "category_summary"
            referencedColumns: ["category_id"]
          },
          {
            foreignKeyName: "vendor_rules_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "monthly_summary"
            referencedColumns: ["category_id"]
          },
        ]
      }
    }
    Views: {
      category_summary: {
        Row: {
          category_color: string | null
          category_icon: string | null
          category_id: string | null
          category_name: string | null
          last_transaction_date: string | null
          parent_id: string | null
          total_expenses_cents: number | null
          total_income_cents: number | null
          transaction_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "category_summary"
            referencedColumns: ["category_id"]
          },
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "monthly_summary"
            referencedColumns: ["category_id"]
          },
        ]
      }
      monthly_summary: {
        Row: {
          account_id: string | null
          account_name: string | null
          category_color: string | null
          category_icon: string | null
          category_id: string | null
          category_name: string | null
          expense_count: number | null
          expenses_cents: number | null
          income_cents: number | null
          income_count: number | null
          month: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      needs_review: {
        Row: {
          account_id: string | null
          account_name: string | null
          amount: number | null
          category_id: string | null
          category_name: string | null
          confidence: string | null
          created_at: string | null
          date: string | null
          description: string | null
          direction: string | null
          id: string | null
          import_job_id: string | null
          is_reviewed: boolean | null
          is_transfer: boolean | null
          normalized_vendor: string | null
          raw_vendor: string | null
          transfer_group_id: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "category_summary"
            referencedColumns: ["category_id"]
          },
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "monthly_summary"
            referencedColumns: ["category_id"]
          },
          {
            foreignKeyName: "transactions_import_job_id_fkey"
            columns: ["import_job_id"]
            isOneToOne: false
            referencedRelation: "import_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      apply_rule_retroactively: { Args: { p_rule_id: string }; Returns: number }
      classify_transaction: {
        Args: { p_normalized_vendor: string; p_raw_vendor: string }
        Returns: {
          category_id: string
          confidence: string
          matched_rule_id: string
          normalized_vendor: string
        }[]
      }
      compute_transaction_hash: {
        Args: {
          p_account_id: string
          p_amount: number
          p_date: string
          p_direction: string
          p_normalized_vendor: string
        }
        Returns: string
      }
      detect_transfer_keywords: {
        Args: { p_description: string; p_raw_vendor: string }
        Returns: boolean
      }
      find_transfer_pair: {
        Args: {
          p_account_id: string
          p_amount: number
          p_date: string
          p_direction: string
        }
        Returns: string
      }
      import_transactions_batch: {
        Args: {
          p_account_id: string
          p_import_job_id: string
          p_transactions: Json
        }
        Returns: {
          classified_count: number
          duplicate_count: number
          inserted_count: number
          total_processed: number
          transfer_count: number
        }[]
      }
      is_duplicate_transaction: {
        Args: {
          p_account_id: string
          p_amount: number
          p_date: string
          p_direction: string
          p_normalized_vendor: string
        }
        Returns: boolean
      }
      match_vendor_rule: {
        Args: { p_normalized_vendor: string; p_raw_vendor: string }
        Returns: {
          category_id: string
          confidence: string
          match_type: string
          normalized_vendor: string
          priority: number
          rule_id: string
        }[]
      }
      pair_transfers: {
        Args: { p_pair_id: string; p_transaction_id: string }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
