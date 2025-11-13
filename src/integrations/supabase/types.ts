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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      absences: {
        Row: {
          created_at: string | null
          employee_id: string
          fecha: string
          horas_ausencia: number
          id: string
          motivo: string | null
          tipo: string
        }
        Insert: {
          created_at?: string | null
          employee_id: string
          fecha: string
          horas_ausencia: number
          id?: string
          motivo?: string | null
          tipo: string
        }
        Update: {
          created_at?: string | null
          employee_id?: string
          fecha?: string
          horas_ausencia?: number
          id?: string
          motivo?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "absences_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      account_pl_mapping: {
        Row: {
          account_code: string
          centro_code: string | null
          created_at: string
          id: string
          multiplier: number | null
          notes: string | null
          pl_line_code: string
          updated_at: string
        }
        Insert: {
          account_code: string
          centro_code?: string | null
          created_at?: string
          id?: string
          multiplier?: number | null
          notes?: string | null
          pl_line_code: string
          updated_at?: string
        }
        Update: {
          account_code?: string
          centro_code?: string | null
          created_at?: string
          id?: string
          multiplier?: number | null
          notes?: string | null
          pl_line_code?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_pl_mapping_pl_line_code_fkey"
            columns: ["pl_line_code"]
            isOneToOne: false
            referencedRelation: "pl_lines"
            referencedColumns: ["code"]
          },
        ]
      }
      account_templates: {
        Row: {
          account_type: string
          code: string
          created_at: string
          description: string | null
          id: string
          level: number
          name: string
          parent_code: string | null
          pgc_version: string
        }
        Insert: {
          account_type: string
          code: string
          created_at?: string
          description?: string | null
          id?: string
          level: number
          name: string
          parent_code?: string | null
          pgc_version?: string
        }
        Update: {
          account_type?: string
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          level?: number
          name?: string
          parent_code?: string | null
          pgc_version?: string
        }
        Relationships: []
      }
      accounting_entries: {
        Row: {
          centro_code: string
          created_at: string
          created_by: string | null
          description: string
          entry_date: string
          entry_number: number
          fiscal_year_id: string | null
          id: string
          posted_at: string | null
          posted_by: string | null
          serie: string | null
          status: Database["public"]["Enums"]["accounting_entry_status"]
          total_credit: number
          total_debit: number
          updated_at: string
        }
        Insert: {
          centro_code: string
          created_at?: string
          created_by?: string | null
          description: string
          entry_date: string
          entry_number: number
          fiscal_year_id?: string | null
          id?: string
          posted_at?: string | null
          posted_by?: string | null
          serie?: string | null
          status?: Database["public"]["Enums"]["accounting_entry_status"]
          total_credit?: number
          total_debit?: number
          updated_at?: string
        }
        Update: {
          centro_code?: string
          created_at?: string
          created_by?: string | null
          description?: string
          entry_date?: string
          entry_number?: number
          fiscal_year_id?: string | null
          id?: string
          posted_at?: string | null
          posted_by?: string | null
          serie?: string | null
          status?: Database["public"]["Enums"]["accounting_entry_status"]
          total_credit?: number
          total_debit?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounting_entries_centro_code_fkey"
            columns: ["centro_code"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["codigo"]
          },
          {
            foreignKeyName: "accounting_entries_centro_code_fkey"
            columns: ["centro_code"]
            isOneToOne: false
            referencedRelation: "v_user_memberships"
            referencedColumns: ["restaurant_code"]
          },
          {
            foreignKeyName: "accounting_entries_fiscal_year_id_fkey"
            columns: ["fiscal_year_id"]
            isOneToOne: false
            referencedRelation: "fiscal_years"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_taxes: {
        Row: {
          base_amount: number
          created_at: string
          id: string
          tax_amount: number
          tax_code_id: string | null
          tax_rate: number
          transaction_id: string | null
        }
        Insert: {
          base_amount: number
          created_at?: string
          id?: string
          tax_amount: number
          tax_code_id?: string | null
          tax_rate: number
          transaction_id?: string | null
        }
        Update: {
          base_amount?: number
          created_at?: string
          id?: string
          tax_amount?: number
          tax_code_id?: string | null
          tax_rate?: number
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounting_taxes_tax_code_id_fkey"
            columns: ["tax_code_id"]
            isOneToOne: false
            referencedRelation: "tax_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_taxes_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "accounting_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_transactions: {
        Row: {
          account_code: string
          amount: number
          cost_center_id: string | null
          created_at: string
          description: string | null
          document_ref: string | null
          entry_id: string
          id: string
          line_number: number
          movement_type: Database["public"]["Enums"]["movement_type"]
          project_id: string | null
        }
        Insert: {
          account_code: string
          amount: number
          cost_center_id?: string | null
          created_at?: string
          description?: string | null
          document_ref?: string | null
          entry_id: string
          id?: string
          line_number: number
          movement_type: Database["public"]["Enums"]["movement_type"]
          project_id?: string | null
        }
        Update: {
          account_code?: string
          amount?: number
          cost_center_id?: string | null
          created_at?: string
          description?: string | null
          document_ref?: string | null
          entry_id?: string
          id?: string
          line_number?: number
          movement_type?: Database["public"]["Enums"]["movement_type"]
          project_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounting_transactions_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_transactions_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "accounting_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_transactions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      accounts: {
        Row: {
          account_type: string
          active: boolean
          centro_code: string
          code: string
          company_id: string | null
          created_at: string
          id: string
          is_detail: boolean
          level: number
          name: string
          parent_code: string | null
          updated_at: string
        }
        Insert: {
          account_type: string
          active?: boolean
          centro_code: string
          code: string
          company_id?: string | null
          created_at?: string
          id?: string
          is_detail?: boolean
          level?: number
          name: string
          parent_code?: string | null
          updated_at?: string
        }
        Update: {
          account_type?: string
          active?: boolean
          centro_code?: string
          code?: string
          company_id?: string | null
          created_at?: string
          id?: string
          is_detail?: boolean
          level?: number
          name?: string
          parent_code?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_centro_code_fkey"
            columns: ["centro_code"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["codigo"]
          },
          {
            foreignKeyName: "accounts_centro_code_fkey"
            columns: ["centro_code"]
            isOneToOne: false
            referencedRelation: "v_user_memberships"
            referencedColumns: ["restaurant_code"]
          },
          {
            foreignKeyName: "accounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_parent_code_fkey"
            columns: ["parent_code", "centro_code"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["code", "centro_code"]
          },
        ]
      }
      alert_notifications: {
        Row: {
          alert_id: string | null
          centro: string | null
          created_at: string
          destinatario_email: string | null
          destinatario_user_id: string | null
          detalles: Json | null
          email_enviado_at: string | null
          enviada_email: boolean
          id: string
          leida: boolean
          leida_at: string | null
          leida_por: string | null
          mensaje: string
          severidad: string
          tipo: string
          titulo: string
        }
        Insert: {
          alert_id?: string | null
          centro?: string | null
          created_at?: string
          destinatario_email?: string | null
          destinatario_user_id?: string | null
          detalles?: Json | null
          email_enviado_at?: string | null
          enviada_email?: boolean
          id?: string
          leida?: boolean
          leida_at?: string | null
          leida_por?: string | null
          mensaje: string
          severidad?: string
          tipo: string
          titulo: string
        }
        Update: {
          alert_id?: string | null
          centro?: string | null
          created_at?: string
          destinatario_email?: string | null
          destinatario_user_id?: string | null
          detalles?: Json | null
          email_enviado_at?: string | null
          enviada_email?: boolean
          id?: string
          leida?: boolean
          leida_at?: string | null
          leida_por?: string | null
          mensaje?: string
          severidad?: string
          tipo?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "alert_notifications_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "alerts"
            referencedColumns: ["id"]
          },
        ]
      }
      alerts: {
        Row: {
          activo: boolean
          canal: Json
          centro: string | null
          created_at: string
          created_by: string | null
          descripcion: string | null
          destinatarios: Json | null
          id: string
          nombre: string
          periodo_calculo: string
          tipo: string
          umbral_operador: string
          umbral_valor: number | null
          updated_at: string
        }
        Insert: {
          activo?: boolean
          canal?: Json
          centro?: string | null
          created_at?: string
          created_by?: string | null
          descripcion?: string | null
          destinatarios?: Json | null
          id?: string
          nombre: string
          periodo_calculo?: string
          tipo: string
          umbral_operador?: string
          umbral_valor?: number | null
          updated_at?: string
        }
        Update: {
          activo?: boolean
          canal?: Json
          centro?: string | null
          created_at?: string
          created_by?: string | null
          descripcion?: string | null
          destinatarios?: Json | null
          id?: string
          nombre?: string
          periodo_calculo?: string
          tipo?: string
          umbral_operador?: string
          umbral_valor?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      ap_invoices: {
        Row: {
          confidence_score: number | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          customer_address: string | null
          customer_name: string | null
          customer_tax_id: string | null
          due_date: string | null
          id: string
          invoice_date: string | null
          invoice_number: string | null
          job_id: string | null
          payment_terms: string | null
          raw: Json | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          supplier_address: string | null
          supplier_name: string | null
          supplier_tax_id: string | null
          total_amount: number | null
          total_net: number | null
          total_tax: number | null
          updated_at: string | null
          validation_errors: Json | null
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          customer_address?: string | null
          customer_name?: string | null
          customer_tax_id?: string | null
          due_date?: string | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          job_id?: string | null
          payment_terms?: string | null
          raw?: Json | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          supplier_address?: string | null
          supplier_name?: string | null
          supplier_tax_id?: string | null
          total_amount?: number | null
          total_net?: number | null
          total_tax?: number | null
          updated_at?: string | null
          validation_errors?: Json | null
        }
        Update: {
          confidence_score?: number | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          customer_address?: string | null
          customer_name?: string | null
          customer_tax_id?: string | null
          due_date?: string | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          job_id?: string | null
          payment_terms?: string | null
          raw?: Json | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          supplier_address?: string | null
          supplier_name?: string | null
          supplier_tax_id?: string | null
          total_amount?: number | null
          total_net?: number | null
          total_tax?: number | null
          updated_at?: string | null
          validation_errors?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "ap_invoices_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "mindee_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      ap_learning_corrections: {
        Row: {
          centro_code: string | null
          corrected_account: string
          created_at: string | null
          created_by: string | null
          extracted_keywords: string[] | null
          generated_rule_id: string | null
          id: string
          invoice_id: string | null
          invoice_line_id: string | null
          line_amount: number
          line_description: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          rule_status: string | null
          suggested_account: string
          suggested_confidence: number | null
          suggested_rule_id: string | null
          supplier_id: string | null
          supplier_name: string | null
          supplier_tax_id: string | null
        }
        Insert: {
          centro_code?: string | null
          corrected_account: string
          created_at?: string | null
          created_by?: string | null
          extracted_keywords?: string[] | null
          generated_rule_id?: string | null
          id?: string
          invoice_id?: string | null
          invoice_line_id?: string | null
          line_amount: number
          line_description: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          rule_status?: string | null
          suggested_account: string
          suggested_confidence?: number | null
          suggested_rule_id?: string | null
          supplier_id?: string | null
          supplier_name?: string | null
          supplier_tax_id?: string | null
        }
        Update: {
          centro_code?: string | null
          corrected_account?: string
          created_at?: string | null
          created_by?: string | null
          extracted_keywords?: string[] | null
          generated_rule_id?: string | null
          id?: string
          invoice_id?: string | null
          invoice_line_id?: string | null
          line_amount?: number
          line_description?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          rule_status?: string | null
          suggested_account?: string
          suggested_confidence?: number | null
          suggested_rule_id?: string | null
          supplier_id?: string | null
          supplier_name?: string | null
          supplier_tax_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ap_learning_corrections_generated_rule_id_fkey"
            columns: ["generated_rule_id"]
            isOneToOne: false
            referencedRelation: "ap_mapping_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ap_learning_corrections_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices_received"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ap_learning_corrections_invoice_line_id_fkey"
            columns: ["invoice_line_id"]
            isOneToOne: false
            referencedRelation: "invoice_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ap_learning_corrections_suggested_rule_id_fkey"
            columns: ["suggested_rule_id"]
            isOneToOne: false
            referencedRelation: "ap_mapping_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      ap_lines: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          invoice_id: string
          line_number: number
          line_total: number | null
          product_code: string | null
          quantity: number | null
          tax_amount: number | null
          tax_rate: number | null
          unit_of_measure: string | null
          unit_price: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          invoice_id: string
          line_number: number
          line_total?: number | null
          product_code?: string | null
          quantity?: number | null
          tax_amount?: number | null
          tax_rate?: number | null
          unit_of_measure?: string | null
          unit_price?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          invoice_id?: string
          line_number?: number
          line_total?: number | null
          product_code?: string | null
          quantity?: number | null
          tax_amount?: number | null
          tax_rate?: number | null
          unit_of_measure?: string | null
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ap_lines_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "ap_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      ap_mapping_rules: {
        Row: {
          active: boolean | null
          amount_max: number | null
          amount_min: number | null
          centro_code: string | null
          confidence_score: number | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          match_type: string
          priority: number | null
          rationale: string
          rule_name: string
          suggested_ap_account: string
          suggested_centre_id: string | null
          suggested_expense_account: string
          suggested_tax_account: string
          supplier_id: string | null
          supplier_name_pattern: string | null
          supplier_tax_id: string | null
          text_keywords: string[] | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          amount_max?: number | null
          amount_min?: number | null
          centro_code?: string | null
          confidence_score?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          match_type: string
          priority?: number | null
          rationale: string
          rule_name: string
          suggested_ap_account?: string
          suggested_centre_id?: string | null
          suggested_expense_account: string
          suggested_tax_account?: string
          supplier_id?: string | null
          supplier_name_pattern?: string | null
          supplier_tax_id?: string | null
          text_keywords?: string[] | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          amount_max?: number | null
          amount_min?: number | null
          centro_code?: string | null
          confidence_score?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          match_type?: string
          priority?: number | null
          rationale?: string
          rule_name?: string
          suggested_ap_account?: string
          suggested_centre_id?: string | null
          suggested_expense_account?: string
          suggested_tax_account?: string
          supplier_id?: string | null
          supplier_name_pattern?: string | null
          supplier_tax_id?: string | null
          text_keywords?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      api_key_usage_logs: {
        Row: {
          api_key_id: string
          endpoint: string
          error_message: string | null
          id: string
          ip_address: unknown
          method: string
          response_time_ms: number | null
          status_code: number | null
          timestamp: string
          user_agent: string | null
        }
        Insert: {
          api_key_id: string
          endpoint: string
          error_message?: string | null
          id?: string
          ip_address?: unknown
          method: string
          response_time_ms?: number | null
          status_code?: number | null
          timestamp?: string
          user_agent?: string | null
        }
        Update: {
          api_key_id?: string
          endpoint?: string
          error_message?: string | null
          id?: string
          ip_address?: unknown
          method?: string
          response_time_ms?: number | null
          status_code?: number | null
          timestamp?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_key_usage_logs_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          centro_code: string | null
          created_at: string
          created_by: string | null
          expires_at: string | null
          franchisee_id: string | null
          id: string
          ip_whitelist: string[] | null
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          last_used_ip: unknown
          name: string
          rate_limit: number | null
          request_count: number | null
          revoked_at: string | null
          revoked_by: string | null
          revoked_reason: string | null
          scopes: Json | null
          status: string
          user_id: string
        }
        Insert: {
          centro_code?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          franchisee_id?: string | null
          id?: string
          ip_whitelist?: string[] | null
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          last_used_ip?: unknown
          name: string
          rate_limit?: number | null
          request_count?: number | null
          revoked_at?: string | null
          revoked_by?: string | null
          revoked_reason?: string | null
          scopes?: Json | null
          status?: string
          user_id: string
        }
        Update: {
          centro_code?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          franchisee_id?: string | null
          id?: string
          ip_whitelist?: string[] | null
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          last_used_ip?: unknown
          name?: string
          rate_limit?: number | null
          request_count?: number | null
          revoked_at?: string | null
          revoked_by?: string | null
          revoked_reason?: string | null
          scopes?: Json | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_centro_code_fkey"
            columns: ["centro_code"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["codigo"]
          },
          {
            foreignKeyName: "api_keys_centro_code_fkey"
            columns: ["centro_code"]
            isOneToOne: false
            referencedRelation: "v_user_memberships"
            referencedColumns: ["restaurant_code"]
          },
          {
            foreignKeyName: "api_keys_franchisee_id_fkey"
            columns: ["franchisee_id"]
            isOneToOne: false
            referencedRelation: "franchisees"
            referencedColumns: ["id"]
          },
        ]
      }
      app_logs: {
        Row: {
          created_at: string
          function_name: string | null
          id: string
          level: string
          message: string
          meta: Json | null
          request_id: string | null
          source: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          function_name?: string | null
          id?: string
          level: string
          message: string
          meta?: Json | null
          request_id?: string | null
          source: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          function_name?: string | null
          id?: string
          level?: string
          message?: string
          meta?: Json | null
          request_id?: string | null
          source?: string
          user_id?: string | null
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          alias_prefix: string | null
          confidence_threshold: number
          created_at: string
          currency_default: string
          id: string
          updated_at: string
        }
        Insert: {
          alias_prefix?: string | null
          confidence_threshold?: number
          created_at?: string
          currency_default?: string
          id?: string
          updated_at?: string
        }
        Update: {
          alias_prefix?: string | null
          confidence_threshold?: number
          created_at?: string
          currency_default?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      approval_rules: {
        Row: {
          active: boolean | null
          auto_approve_below_threshold: boolean | null
          centro_code: string | null
          created_at: string | null
          id: string
          max_amount: number | null
          min_amount: number | null
          requires_accounting_approval: boolean | null
          requires_manager_approval: boolean | null
          rule_name: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          auto_approve_below_threshold?: boolean | null
          centro_code?: string | null
          created_at?: string | null
          id?: string
          max_amount?: number | null
          min_amount?: number | null
          requires_accounting_approval?: boolean | null
          requires_manager_approval?: boolean | null
          rule_name: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          auto_approve_below_threshold?: boolean | null
          centro_code?: string | null
          created_at?: string | null
          id?: string
          max_amount?: number | null
          min_amount?: number | null
          requires_accounting_approval?: boolean | null
          requires_manager_approval?: boolean | null
          rule_name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "approval_rules_centro_code_fkey"
            columns: ["centro_code"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["codigo"]
          },
          {
            foreignKeyName: "approval_rules_centro_code_fkey"
            columns: ["centro_code"]
            isOneToOne: false
            referencedRelation: "v_user_memberships"
            referencedColumns: ["restaurant_code"]
          },
        ]
      }
      asset_depreciations: {
        Row: {
          accounting_entry_id: string | null
          accumulated_depreciation: number
          asset_id: string
          book_value: number
          created_at: string
          depreciation_amount: number
          id: string
          period_month: number
          period_year: number
        }
        Insert: {
          accounting_entry_id?: string | null
          accumulated_depreciation: number
          asset_id: string
          book_value: number
          created_at?: string
          depreciation_amount: number
          id?: string
          period_month: number
          period_year: number
        }
        Update: {
          accounting_entry_id?: string | null
          accumulated_depreciation?: number
          asset_id?: string
          book_value?: number
          created_at?: string
          depreciation_amount?: number
          id?: string
          period_month?: number
          period_year?: number
        }
        Relationships: [
          {
            foreignKeyName: "asset_depreciations_accounting_entry_id_fkey"
            columns: ["accounting_entry_id"]
            isOneToOne: false
            referencedRelation: "accounting_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_depreciations_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "fixed_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: Database["public"]["Enums"]["audit_action"]
          created_at: string
          diff: Json | null
          id: string
          ip_address: unknown
          new_data: Json | null
          old_data: Json | null
          row_id: string | null
          table_name: string
          user_agent: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action: Database["public"]["Enums"]["audit_action"]
          created_at?: string
          diff?: Json | null
          id?: string
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          row_id?: string | null
          table_name: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: Database["public"]["Enums"]["audit_action"]
          created_at?: string
          diff?: Json | null
          id?: string
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          row_id?: string | null
          table_name?: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      bank_accounts: {
        Row: {
          account_code: string | null
          account_name: string
          active: boolean | null
          centro_code: string
          created_at: string | null
          currency: string | null
          current_balance: number | null
          iban: string
          id: string
          swift: string | null
          updated_at: string | null
        }
        Insert: {
          account_code?: string | null
          account_name: string
          active?: boolean | null
          centro_code: string
          created_at?: string | null
          currency?: string | null
          current_balance?: number | null
          iban: string
          id?: string
          swift?: string | null
          updated_at?: string | null
        }
        Update: {
          account_code?: string | null
          account_name?: string
          active?: boolean | null
          centro_code?: string
          created_at?: string | null
          currency?: string | null
          current_balance?: number | null
          iban?: string
          id?: string
          swift?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      bank_reconciliation_rules: {
        Row: {
          active: boolean | null
          amount_max: number | null
          amount_min: number | null
          auto_match_type: string
          bank_account_id: string | null
          centro_code: string | null
          confidence_threshold: number | null
          created_at: string | null
          description_pattern: string | null
          id: string
          priority: number | null
          rule_name: string
          suggested_account: string | null
          transaction_type: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          amount_max?: number | null
          amount_min?: number | null
          auto_match_type: string
          bank_account_id?: string | null
          centro_code?: string | null
          confidence_threshold?: number | null
          created_at?: string | null
          description_pattern?: string | null
          id?: string
          priority?: number | null
          rule_name: string
          suggested_account?: string | null
          transaction_type?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          amount_max?: number | null
          amount_min?: number | null
          auto_match_type?: string
          bank_account_id?: string | null
          centro_code?: string | null
          confidence_threshold?: number | null
          created_at?: string | null
          description_pattern?: string | null
          id?: string
          priority?: number | null
          rule_name?: string
          suggested_account?: string | null
          transaction_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_reconciliation_rules_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_reconciliation_rules_centro_code_fkey"
            columns: ["centro_code"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["codigo"]
          },
          {
            foreignKeyName: "bank_reconciliation_rules_centro_code_fkey"
            columns: ["centro_code"]
            isOneToOne: false
            referencedRelation: "v_user_memberships"
            referencedColumns: ["restaurant_code"]
          },
        ]
      }
      bank_reconciliations: {
        Row: {
          bank_transaction_id: string
          confidence_score: number | null
          created_at: string | null
          id: string
          matched_id: string | null
          matched_type: string | null
          metadata: Json | null
          notes: string | null
          reconciled_at: string | null
          reconciled_by: string | null
          reconciliation_status: string | null
          rule_id: string | null
          updated_at: string | null
        }
        Insert: {
          bank_transaction_id: string
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          matched_id?: string | null
          matched_type?: string | null
          metadata?: Json | null
          notes?: string | null
          reconciled_at?: string | null
          reconciled_by?: string | null
          reconciliation_status?: string | null
          rule_id?: string | null
          updated_at?: string | null
        }
        Update: {
          bank_transaction_id?: string
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          matched_id?: string | null
          matched_type?: string | null
          metadata?: Json | null
          notes?: string | null
          reconciled_at?: string | null
          reconciled_by?: string | null
          reconciliation_status?: string | null
          rule_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_reconciliations_bank_transaction_id_fkey"
            columns: ["bank_transaction_id"]
            isOneToOne: true
            referencedRelation: "bank_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_reconciliations_reconciled_by_fkey"
            columns: ["reconciled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_reconciliations_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "bank_reconciliation_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_remittances: {
        Row: {
          bank_account_id: string
          centro_code: string
          created_at: string
          created_by: string | null
          id: string
          remittance_date: string
          remittance_number: string
          remittance_type: string
          sepa_file_path: string | null
          status: string
          total_amount: number
          total_items: number
          updated_at: string
        }
        Insert: {
          bank_account_id: string
          centro_code: string
          created_at?: string
          created_by?: string | null
          id?: string
          remittance_date: string
          remittance_number: string
          remittance_type: string
          sepa_file_path?: string | null
          status?: string
          total_amount?: number
          total_items?: number
          updated_at?: string
        }
        Update: {
          bank_account_id?: string
          centro_code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          remittance_date?: string
          remittance_number?: string
          remittance_type?: string
          sepa_file_path?: string | null
          status?: string
          total_amount?: number
          total_items?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_remittances_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_transactions: {
        Row: {
          amount: number
          balance: number | null
          bank_account_id: string
          created_at: string | null
          description: string
          id: string
          import_batch_id: string | null
          matched_entry_id: string | null
          matched_invoice_id: string | null
          reconciliation_id: string | null
          reference: string | null
          status: string | null
          transaction_date: string
          value_date: string | null
        }
        Insert: {
          amount: number
          balance?: number | null
          bank_account_id: string
          created_at?: string | null
          description: string
          id?: string
          import_batch_id?: string | null
          matched_entry_id?: string | null
          matched_invoice_id?: string | null
          reconciliation_id?: string | null
          reference?: string | null
          status?: string | null
          transaction_date: string
          value_date?: string | null
        }
        Update: {
          amount?: number
          balance?: number | null
          bank_account_id?: string
          created_at?: string | null
          description?: string
          id?: string
          import_batch_id?: string | null
          matched_entry_id?: string | null
          matched_invoice_id?: string | null
          reconciliation_id?: string | null
          reference?: string | null
          status?: string | null
          transaction_date?: string
          value_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_transactions_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_matched_entry_id_fkey"
            columns: ["matched_entry_id"]
            isOneToOne: false
            referencedRelation: "accounting_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_bank_transactions_reconciliation"
            columns: ["reconciliation_id"]
            isOneToOne: false
            referencedRelation: "bank_reconciliations"
            referencedColumns: ["id"]
          },
        ]
      }
      centre_companies: {
        Row: {
          activo: boolean
          centre_id: string
          cif: string
          created_at: string
          es_principal: boolean
          id: string
          razon_social: string
          tipo_sociedad: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          centre_id: string
          cif: string
          created_at?: string
          es_principal?: boolean
          id?: string
          razon_social: string
          tipo_sociedad?: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          centre_id?: string
          cif?: string
          created_at?: string
          es_principal?: boolean
          id?: string
          razon_social?: string
          tipo_sociedad?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "centre_companies_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["id"]
          },
        ]
      }
      centres: {
        Row: {
          activo: boolean
          ciudad: string | null
          codigo: string
          company_id: string | null
          company_tax_id: string | null
          created_at: string
          direccion: string | null
          franchisee_email: string | null
          franchisee_id: string | null
          franchisee_name: string | null
          id: string
          nombre: string
          opening_date: string | null
          orquest_business_id: string | null
          orquest_service_id: string | null
          pais: string | null
          postal_code: string | null
          seating_capacity: number | null
          site_number: string | null
          square_meters: number | null
          state: string | null
          updated_at: string
        }
        Insert: {
          activo?: boolean
          ciudad?: string | null
          codigo: string
          company_id?: string | null
          company_tax_id?: string | null
          created_at?: string
          direccion?: string | null
          franchisee_email?: string | null
          franchisee_id?: string | null
          franchisee_name?: string | null
          id?: string
          nombre: string
          opening_date?: string | null
          orquest_business_id?: string | null
          orquest_service_id?: string | null
          pais?: string | null
          postal_code?: string | null
          seating_capacity?: number | null
          site_number?: string | null
          square_meters?: number | null
          state?: string | null
          updated_at?: string
        }
        Update: {
          activo?: boolean
          ciudad?: string | null
          codigo?: string
          company_id?: string | null
          company_tax_id?: string | null
          created_at?: string
          direccion?: string | null
          franchisee_email?: string | null
          franchisee_id?: string | null
          franchisee_name?: string | null
          id?: string
          nombre?: string
          opening_date?: string | null
          orquest_business_id?: string | null
          orquest_service_id?: string | null
          pais?: string | null
          postal_code?: string | null
          seating_capacity?: number | null
          site_number?: string | null
          square_meters?: number | null
          state?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "centres_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "centres_franchisee_id_fkey"
            columns: ["franchisee_id"]
            isOneToOne: false
            referencedRelation: "franchisees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_centres_franchisee"
            columns: ["franchisee_id"]
            isOneToOne: false
            referencedRelation: "franchisees"
            referencedColumns: ["id"]
          },
        ]
      }
      centres_companies_snapshot_20241109: {
        Row: {
          centre_code: string | null
          centre_id: string | null
          centre_name: string | null
          franchisee_id: string | null
          old_cif: string | null
          old_company_id: string | null
          old_razon_social: string | null
          old_tipo_sociedad: string | null
          snapshot_date: string | null
        }
        Insert: {
          centre_code?: string | null
          centre_id?: string | null
          centre_name?: string | null
          franchisee_id?: string | null
          old_cif?: string | null
          old_company_id?: string | null
          old_razon_social?: string | null
          old_tipo_sociedad?: string | null
          snapshot_date?: string | null
        }
        Update: {
          centre_code?: string | null
          centre_id?: string | null
          centre_name?: string | null
          franchisee_id?: string | null
          old_cif?: string | null
          old_company_id?: string | null
          old_razon_social?: string | null
          old_tipo_sociedad?: string | null
          snapshot_date?: string | null
        }
        Relationships: []
      }
      companies: {
        Row: {
          activo: boolean | null
          cif: string
          created_at: string | null
          franchisee_id: string | null
          id: string
          razon_social: string
          tipo_sociedad: string | null
          updated_at: string | null
        }
        Insert: {
          activo?: boolean | null
          cif: string
          created_at?: string | null
          franchisee_id?: string | null
          id?: string
          razon_social: string
          tipo_sociedad?: string | null
          updated_at?: string | null
        }
        Update: {
          activo?: boolean | null
          cif?: string
          created_at?: string | null
          franchisee_id?: string | null
          id?: string
          razon_social?: string
          tipo_sociedad?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_franchisee_id_fkey"
            columns: ["franchisee_id"]
            isOneToOne: false
            referencedRelation: "franchisees"
            referencedColumns: ["id"]
          },
        ]
      }
      companies_backup_20241109: {
        Row: {
          activo: boolean | null
          cif: string | null
          created_at: string | null
          franchisee_id: string | null
          id: string | null
          razon_social: string | null
          tipo_sociedad: string | null
          updated_at: string | null
        }
        Insert: {
          activo?: boolean | null
          cif?: string | null
          created_at?: string | null
          franchisee_id?: string | null
          id?: string | null
          razon_social?: string | null
          tipo_sociedad?: string | null
          updated_at?: string | null
        }
        Update: {
          activo?: boolean | null
          cif?: string | null
          created_at?: string | null
          franchisee_id?: string | null
          id?: string | null
          razon_social?: string | null
          tipo_sociedad?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      company_enrichment_cache: {
        Row: {
          cif: string
          confidence: string
          created_at: string
          enriched_data: Json
          expires_at: string
          last_accessed_at: string
          search_count: number
          sources: Json | null
        }
        Insert: {
          cif: string
          confidence: string
          created_at?: string
          enriched_data: Json
          expires_at: string
          last_accessed_at?: string
          search_count?: number
          sources?: Json | null
        }
        Update: {
          cif?: string
          confidence?: string
          created_at?: string
          enriched_data?: Json
          expires_at?: string
          last_accessed_at?: string
          search_count?: number
          sources?: Json | null
        }
        Relationships: []
      }
      compliance_alerts: {
        Row: {
          alert_type: string
          centro_code: string
          created_at: string | null
          description: string
          id: string
          invoice_id: string
          invoice_type: string
          metadata: Json | null
          resolution_notes: string | null
          resolved: boolean | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          title: string
        }
        Insert: {
          alert_type: string
          centro_code: string
          created_at?: string | null
          description: string
          id?: string
          invoice_id: string
          invoice_type: string
          metadata?: Json | null
          resolution_notes?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity: string
          title: string
        }
        Update: {
          alert_type?: string
          centro_code?: string
          created_at?: string | null
          description?: string
          id?: string
          invoice_id?: string
          invoice_type?: string
          metadata?: Json | null
          resolution_notes?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          title?: string
        }
        Relationships: []
      }
      cost_centers: {
        Row: {
          active: boolean
          centro_code: string
          code: string
          created_at: string
          description: string | null
          id: string
          name: string
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          centro_code: string
          code: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          centro_code?: string
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cost_centers_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_closures: {
        Row: {
          accounting_entry_id: string | null
          actual_cash: number | null
          card_amount: number | null
          cash_amount: number | null
          cash_difference: number | null
          centro_code: string
          closure_date: string
          created_at: string | null
          delivery_amount: number | null
          delivery_commission: number | null
          expected_cash: number | null
          id: string
          marketing_fee: number | null
          notes: string | null
          pos_data: Json | null
          posted_at: string | null
          posted_by: string | null
          royalty_amount: number | null
          sales_delivery: number | null
          sales_drive_thru: number | null
          sales_in_store: number | null
          sales_kiosk: number | null
          status: string | null
          tax_10_amount: number | null
          tax_10_base: number | null
          tax_21_amount: number | null
          tax_21_base: number | null
          total_sales: number | null
          total_tax: number | null
          updated_at: string | null
          validated_at: string | null
          validated_by: string | null
        }
        Insert: {
          accounting_entry_id?: string | null
          actual_cash?: number | null
          card_amount?: number | null
          cash_amount?: number | null
          cash_difference?: number | null
          centro_code: string
          closure_date: string
          created_at?: string | null
          delivery_amount?: number | null
          delivery_commission?: number | null
          expected_cash?: number | null
          id?: string
          marketing_fee?: number | null
          notes?: string | null
          pos_data?: Json | null
          posted_at?: string | null
          posted_by?: string | null
          royalty_amount?: number | null
          sales_delivery?: number | null
          sales_drive_thru?: number | null
          sales_in_store?: number | null
          sales_kiosk?: number | null
          status?: string | null
          tax_10_amount?: number | null
          tax_10_base?: number | null
          tax_21_amount?: number | null
          tax_21_base?: number | null
          total_sales?: number | null
          total_tax?: number | null
          updated_at?: string | null
          validated_at?: string | null
          validated_by?: string | null
        }
        Update: {
          accounting_entry_id?: string | null
          actual_cash?: number | null
          card_amount?: number | null
          cash_amount?: number | null
          cash_difference?: number | null
          centro_code?: string
          closure_date?: string
          created_at?: string | null
          delivery_amount?: number | null
          delivery_commission?: number | null
          expected_cash?: number | null
          id?: string
          marketing_fee?: number | null
          notes?: string | null
          pos_data?: Json | null
          posted_at?: string | null
          posted_by?: string | null
          royalty_amount?: number | null
          sales_delivery?: number | null
          sales_drive_thru?: number | null
          sales_in_store?: number | null
          sales_kiosk?: number | null
          status?: string | null
          tax_10_amount?: number | null
          tax_10_base?: number | null
          tax_21_amount?: number | null
          tax_21_base?: number | null
          total_sales?: number | null
          total_tax?: number | null
          updated_at?: string | null
          validated_at?: string | null
          validated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_closures_accounting_entry_id_fkey"
            columns: ["accounting_entry_id"]
            isOneToOne: false
            referencedRelation: "accounting_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_closures_centro_code_fkey"
            columns: ["centro_code"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["codigo"]
          },
          {
            foreignKeyName: "daily_closures_centro_code_fkey"
            columns: ["centro_code"]
            isOneToOne: false
            referencedRelation: "v_user_memberships"
            referencedColumns: ["restaurant_code"]
          },
          {
            foreignKeyName: "daily_closures_posted_by_fkey"
            columns: ["posted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_closures_validated_by_fkey"
            columns: ["validated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      data_retention_settings: {
        Row: {
          created_at: string | null
          id: string
          retention_invoices_approved_days: number | null
          retention_logs_days: number | null
          retention_mindee_days: number | null
          retention_mindee_payloads: boolean | null
          sanitize_logs: boolean | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          retention_invoices_approved_days?: number | null
          retention_logs_days?: number | null
          retention_mindee_days?: number | null
          retention_mindee_payloads?: boolean | null
          sanitize_logs?: boolean | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          retention_invoices_approved_days?: number | null
          retention_logs_days?: number | null
          retention_mindee_days?: number | null
          retention_mindee_payloads?: boolean | null
          sanitize_logs?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      dq_issues: {
        Row: {
          centro: string | null
          created_at: string
          detalle: Json | null
          employee_id: string | null
          id: string
          periodo_fin: string
          periodo_inicio: string
          resuelto: boolean
          resuelto_at: string | null
          resuelto_por: string | null
          severidad: Database["public"]["Enums"]["dq_severity"]
          tipo: string
          updated_at: string
        }
        Insert: {
          centro?: string | null
          created_at?: string
          detalle?: Json | null
          employee_id?: string | null
          id?: string
          periodo_fin: string
          periodo_inicio: string
          resuelto?: boolean
          resuelto_at?: string | null
          resuelto_por?: string | null
          severidad?: Database["public"]["Enums"]["dq_severity"]
          tipo: string
          updated_at?: string
        }
        Update: {
          centro?: string | null
          created_at?: string
          detalle?: Json | null
          employee_id?: string | null
          id?: string
          periodo_fin?: string
          periodo_inicio?: string
          resuelto?: boolean
          resuelto_at?: string | null
          resuelto_por?: string | null
          severidad?: Database["public"]["Enums"]["dq_severity"]
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dq_issues_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dq_issues_resuelto_por_fkey"
            columns: ["resuelto_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          apellidos: string
          centro: string | null
          codtrabajador_a3nom: string | null
          created_at: string | null
          email: string | null
          employee_id_orquest: string | null
          fecha_alta: string | null
          fecha_baja: string | null
          id: string
          nombre: string
          updated_at: string | null
        }
        Insert: {
          apellidos: string
          centro?: string | null
          codtrabajador_a3nom?: string | null
          created_at?: string | null
          email?: string | null
          employee_id_orquest?: string | null
          fecha_alta?: string | null
          fecha_baja?: string | null
          id?: string
          nombre: string
          updated_at?: string | null
        }
        Update: {
          apellidos?: string
          centro?: string | null
          codtrabajador_a3nom?: string | null
          created_at?: string | null
          email?: string | null
          employee_id_orquest?: string | null
          fecha_alta?: string | null
          fecha_baja?: string | null
          id?: string
          nombre?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      entry_template_lines: {
        Row: {
          account_code: string
          amount_formula: string | null
          created_at: string
          description: string | null
          id: string
          line_number: number
          movement_type: Database["public"]["Enums"]["movement_type"]
          template_id: string
        }
        Insert: {
          account_code: string
          amount_formula?: string | null
          created_at?: string
          description?: string | null
          id?: string
          line_number: number
          movement_type: Database["public"]["Enums"]["movement_type"]
          template_id: string
        }
        Update: {
          account_code?: string
          amount_formula?: string | null
          created_at?: string
          description?: string | null
          id?: string
          line_number?: number
          movement_type?: Database["public"]["Enums"]["movement_type"]
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entry_template_lines_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "entry_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      entry_templates: {
        Row: {
          category: string | null
          centro_code: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_system: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          centro_code?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_system?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          centro_code?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_system?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      facturae_xml_files: {
        Row: {
          aeat_response: Json | null
          created_at: string | null
          file_path: string | null
          id: string
          invoice_id: string
          invoice_type: string
          sent_at: string | null
          sent_to_aeat: boolean | null
          signed: boolean | null
          updated_at: string | null
          xml_content: string
          xml_version: string
        }
        Insert: {
          aeat_response?: Json | null
          created_at?: string | null
          file_path?: string | null
          id?: string
          invoice_id: string
          invoice_type: string
          sent_at?: string | null
          sent_to_aeat?: boolean | null
          signed?: boolean | null
          updated_at?: string | null
          xml_content: string
          xml_version?: string
        }
        Update: {
          aeat_response?: Json | null
          created_at?: string | null
          file_path?: string | null
          id?: string
          invoice_id?: string
          invoice_type?: string
          sent_at?: string | null
          sent_to_aeat?: boolean | null
          signed?: boolean | null
          updated_at?: string | null
          xml_content?: string
          xml_version?: string
        }
        Relationships: []
      }
      fiscal_years: {
        Row: {
          centro_code: string | null
          closed_by: string | null
          closing_date: string | null
          closing_entry_id: string | null
          created_at: string
          end_date: string
          id: string
          start_date: string
          status: string
          updated_at: string
          year: number
        }
        Insert: {
          centro_code?: string | null
          closed_by?: string | null
          closing_date?: string | null
          closing_entry_id?: string | null
          created_at?: string
          end_date: string
          id?: string
          start_date: string
          status?: string
          updated_at?: string
          year: number
        }
        Update: {
          centro_code?: string | null
          closed_by?: string | null
          closing_date?: string | null
          closing_entry_id?: string | null
          created_at?: string
          end_date?: string
          id?: string
          start_date?: string
          status?: string
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "fiscal_years_centro_code_fkey"
            columns: ["centro_code"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["codigo"]
          },
          {
            foreignKeyName: "fiscal_years_centro_code_fkey"
            columns: ["centro_code"]
            isOneToOne: false
            referencedRelation: "v_user_memberships"
            referencedColumns: ["restaurant_code"]
          },
          {
            foreignKeyName: "fiscal_years_closing_entry_id_fkey"
            columns: ["closing_entry_id"]
            isOneToOne: false
            referencedRelation: "accounting_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      fixed_assets: {
        Row: {
          account_code: string
          accumulated_depreciation: number | null
          acquisition_date: string
          acquisition_value: number
          asset_code: string
          centro_code: string
          created_at: string
          current_value: number | null
          depreciation_method: string
          description: string
          disposal_date: string | null
          disposal_value: number | null
          id: string
          invoice_ref: string | null
          location: string | null
          notes: string | null
          residual_value: number | null
          status: string
          supplier_id: string | null
          updated_at: string
          useful_life_years: number
        }
        Insert: {
          account_code: string
          accumulated_depreciation?: number | null
          acquisition_date: string
          acquisition_value: number
          asset_code: string
          centro_code: string
          created_at?: string
          current_value?: number | null
          depreciation_method?: string
          description: string
          disposal_date?: string | null
          disposal_value?: number | null
          id?: string
          invoice_ref?: string | null
          location?: string | null
          notes?: string | null
          residual_value?: number | null
          status?: string
          supplier_id?: string | null
          updated_at?: string
          useful_life_years: number
        }
        Update: {
          account_code?: string
          accumulated_depreciation?: number | null
          acquisition_date?: string
          acquisition_value?: number
          asset_code?: string
          centro_code?: string
          created_at?: string
          current_value?: number | null
          depreciation_method?: string
          description?: string
          disposal_date?: string | null
          disposal_value?: number | null
          id?: string
          invoice_ref?: string | null
          location?: string | null
          notes?: string | null
          residual_value?: number | null
          status?: string
          supplier_id?: string | null
          updated_at?: string
          useful_life_years?: number
        }
        Relationships: []
      }
      franchisees: {
        Row: {
          company_tax_id: string | null
          created_at: string | null
          email: string
          id: string
          name: string
          orquest_api_key: string | null
          orquest_business_id: string | null
          updated_at: string | null
        }
        Insert: {
          company_tax_id?: string | null
          created_at?: string | null
          email: string
          id?: string
          name: string
          orquest_api_key?: string | null
          orquest_business_id?: string | null
          updated_at?: string | null
        }
        Update: {
          company_tax_id?: string | null
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          orquest_api_key?: string | null
          orquest_business_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      import_logs: {
        Row: {
          created_at: string | null
          error_details: Json | null
          error_rows: number
          file_name: string
          file_type: string
          id: string
          loaded_rows: number
          skipped_rows: number
          status: string
          total_rows: number
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          error_details?: Json | null
          error_rows?: number
          file_name: string
          file_type: string
          id?: string
          loaded_rows?: number
          skipped_rows?: number
          status?: string
          total_rows?: number
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          error_details?: Json | null
          error_rows?: number
          file_name?: string
          file_type?: string
          id?: string
          loaded_rows?: number
          skipped_rows?: number
          status?: string
          total_rows?: number
          user_id?: string | null
        }
        Relationships: []
      }
      import_mapping_profiles: {
        Row: {
          column_mappings: Json
          created_at: string | null
          file_type: string
          id: string
          profile_name: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          column_mappings: Json
          created_at?: string | null
          file_type: string
          id?: string
          profile_name: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          column_mappings?: Json
          created_at?: string | null
          file_type?: string
          id?: string
          profile_name?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      import_runs: {
        Row: {
          centro_code: string | null
          created_at: string
          created_by: string | null
          error_log: Json | null
          filename: string | null
          finished_at: string | null
          id: string
          module: string
          source: string
          started_at: string
          stats: Json | null
          status: string
          updated_at: string
        }
        Insert: {
          centro_code?: string | null
          created_at?: string
          created_by?: string | null
          error_log?: Json | null
          filename?: string | null
          finished_at?: string | null
          id?: string
          module: string
          source: string
          started_at?: string
          stats?: Json | null
          status?: string
          updated_at?: string
        }
        Update: {
          centro_code?: string | null
          created_at?: string
          created_by?: string | null
          error_log?: Json | null
          filename?: string | null
          finished_at?: string | null
          id?: string
          module?: string
          source?: string
          started_at?: string
          stats?: Json | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_runs_centro_code_fkey"
            columns: ["centro_code"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["codigo"]
          },
          {
            foreignKeyName: "import_runs_centro_code_fkey"
            columns: ["centro_code"]
            isOneToOne: false
            referencedRelation: "v_user_memberships"
            referencedColumns: ["restaurant_code"]
          },
        ]
      }
      invites: {
        Row: {
          accepted_at: string | null
          centro: string | null
          created_at: string
          email: string
          expires_at: string
          franchisee_id: string | null
          id: string
          invited_by: string | null
          role: Database["public"]["Enums"]["app_role"]
          token: string
        }
        Insert: {
          accepted_at?: string | null
          centro?: string | null
          created_at?: string
          email: string
          expires_at: string
          franchisee_id?: string | null
          id?: string
          invited_by?: string | null
          role: Database["public"]["Enums"]["app_role"]
          token: string
        }
        Update: {
          accepted_at?: string | null
          centro?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          franchisee_id?: string | null
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "invites_franchisee_id_fkey"
            columns: ["franchisee_id"]
            isOneToOne: false
            referencedRelation: "franchisees"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_approvals: {
        Row: {
          action: string
          approval_level: string
          approver_id: string
          comments: string | null
          created_at: string | null
          id: string
          invoice_id: string
        }
        Insert: {
          action: string
          approval_level: string
          approver_id: string
          comments?: string | null
          created_at?: string | null
          id?: string
          invoice_id: string
        }
        Update: {
          action?: string
          approval_level?: string
          approver_id?: string
          comments?: string | null
          created_at?: string | null
          id?: string
          invoice_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_approvals_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices_received"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_lines: {
        Row: {
          account_code: string | null
          created_at: string | null
          description: string
          discount_amount: number | null
          discount_percentage: number | null
          id: string
          invoice_id: string
          invoice_type: string
          line_number: number
          quantity: number | null
          recargo_equivalencia: number | null
          retencion_amount: number | null
          retencion_percentage: number | null
          subtotal: number
          tax_amount: number
          tax_code_id: string | null
          tax_rate: number | null
          total: number
          unit_price: number
        }
        Insert: {
          account_code?: string | null
          created_at?: string | null
          description: string
          discount_amount?: number | null
          discount_percentage?: number | null
          id?: string
          invoice_id: string
          invoice_type: string
          line_number: number
          quantity?: number | null
          recargo_equivalencia?: number | null
          retencion_amount?: number | null
          retencion_percentage?: number | null
          subtotal: number
          tax_amount: number
          tax_code_id?: string | null
          tax_rate?: number | null
          total: number
          unit_price: number
        }
        Update: {
          account_code?: string | null
          created_at?: string | null
          description?: string
          discount_amount?: number | null
          discount_percentage?: number | null
          id?: string
          invoice_id?: string
          invoice_type?: string
          line_number?: number
          quantity?: number | null
          recargo_equivalencia?: number | null
          retencion_amount?: number | null
          retencion_percentage?: number | null
          subtotal?: number
          tax_amount?: number
          tax_code_id?: string | null
          tax_rate?: number | null
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_lines_tax_code_id_fkey"
            columns: ["tax_code_id"]
            isOneToOne: false
            referencedRelation: "tax_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_sequences: {
        Row: {
          centro_code: string
          created_at: string | null
          id: string
          invoice_type: string
          last_number: number | null
          series: string
          updated_at: string | null
          year: number
        }
        Insert: {
          centro_code: string
          created_at?: string | null
          id?: string
          invoice_type: string
          last_number?: number | null
          series: string
          updated_at?: string | null
          year: number
        }
        Update: {
          centro_code?: string
          created_at?: string | null
          id?: string
          invoice_type?: string
          last_number?: number | null
          series?: string
          updated_at?: string | null
          year?: number
        }
        Relationships: []
      }
      invoices_issued: {
        Row: {
          centro_code: string
          created_at: string | null
          created_by: string | null
          customer_address: string | null
          customer_email: string | null
          customer_name: string
          customer_tax_id: string | null
          due_date: string | null
          entry_id: string | null
          full_invoice_number: string | null
          id: string
          invoice_date: string
          invoice_number: number
          invoice_series: string | null
          notes: string | null
          paid_at: string | null
          payment_transaction_id: string | null
          pdf_path: string | null
          sent_at: string | null
          status: string | null
          subtotal: number | null
          tax_total: number | null
          total: number
          updated_at: string | null
          verifactu_hash: string | null
          verifactu_sent_at: string | null
          verifactu_sent_to_aeat: boolean | null
          verifactu_signed: boolean | null
        }
        Insert: {
          centro_code: string
          created_at?: string | null
          created_by?: string | null
          customer_address?: string | null
          customer_email?: string | null
          customer_name: string
          customer_tax_id?: string | null
          due_date?: string | null
          entry_id?: string | null
          full_invoice_number?: string | null
          id?: string
          invoice_date: string
          invoice_number: number
          invoice_series?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_transaction_id?: string | null
          pdf_path?: string | null
          sent_at?: string | null
          status?: string | null
          subtotal?: number | null
          tax_total?: number | null
          total: number
          updated_at?: string | null
          verifactu_hash?: string | null
          verifactu_sent_at?: string | null
          verifactu_sent_to_aeat?: boolean | null
          verifactu_signed?: boolean | null
        }
        Update: {
          centro_code?: string
          created_at?: string | null
          created_by?: string | null
          customer_address?: string | null
          customer_email?: string | null
          customer_name?: string
          customer_tax_id?: string | null
          due_date?: string | null
          entry_id?: string | null
          full_invoice_number?: string | null
          id?: string
          invoice_date?: string
          invoice_number?: number
          invoice_series?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_transaction_id?: string | null
          pdf_path?: string | null
          sent_at?: string | null
          status?: string | null
          subtotal?: number | null
          tax_total?: number | null
          total?: number
          updated_at?: string | null
          verifactu_hash?: string | null
          verifactu_sent_at?: string | null
          verifactu_sent_to_aeat?: boolean | null
          verifactu_signed?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_issued_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "accounting_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_issued_payment_transaction_id_fkey"
            columns: ["payment_transaction_id"]
            isOneToOne: false
            referencedRelation: "bank_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices_received: {
        Row: {
          approval_status: string | null
          centro_code: string
          created_at: string | null
          created_by: string | null
          document_hash: string | null
          document_path: string | null
          due_date: string | null
          entry_id: string | null
          file_name: string | null
          file_path: string | null
          id: string
          invoice_date: string
          invoice_number: string
          job_id: string | null
          notes: string | null
          ocr_confidence: number | null
          ocr_confidence_notes: string[] | null
          ocr_cost_estimate_eur: number | null
          ocr_engine: string | null
          ocr_extracted_data: Json | null
          ocr_merge_notes: string[] | null
          ocr_ms_mindee: number | null
          ocr_ms_openai: number | null
          ocr_pages: number | null
          ocr_payload: Json | null
          ocr_processing_time_ms: number | null
          ocr_tokens_in: number | null
          ocr_tokens_out: number | null
          payment_transaction_id: string | null
          rejected_at: string | null
          rejected_by: string | null
          rejected_reason: string | null
          requires_accounting_approval: boolean | null
          requires_manager_approval: boolean | null
          status: string | null
          subtotal: number | null
          supplier_id: string | null
          tax_total: number | null
          total: number
          updated_at: string | null
          uploaded_at: string | null
          uploaded_by: string | null
          verifactu_hash: string | null
          verifactu_verified: boolean | null
          verifactu_verified_at: string | null
        }
        Insert: {
          approval_status?: string | null
          centro_code: string
          created_at?: string | null
          created_by?: string | null
          document_hash?: string | null
          document_path?: string | null
          due_date?: string | null
          entry_id?: string | null
          file_name?: string | null
          file_path?: string | null
          id?: string
          invoice_date: string
          invoice_number: string
          job_id?: string | null
          notes?: string | null
          ocr_confidence?: number | null
          ocr_confidence_notes?: string[] | null
          ocr_cost_estimate_eur?: number | null
          ocr_engine?: string | null
          ocr_extracted_data?: Json | null
          ocr_merge_notes?: string[] | null
          ocr_ms_mindee?: number | null
          ocr_ms_openai?: number | null
          ocr_pages?: number | null
          ocr_payload?: Json | null
          ocr_processing_time_ms?: number | null
          ocr_tokens_in?: number | null
          ocr_tokens_out?: number | null
          payment_transaction_id?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejected_reason?: string | null
          requires_accounting_approval?: boolean | null
          requires_manager_approval?: boolean | null
          status?: string | null
          subtotal?: number | null
          supplier_id?: string | null
          tax_total?: number | null
          total: number
          updated_at?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
          verifactu_hash?: string | null
          verifactu_verified?: boolean | null
          verifactu_verified_at?: string | null
        }
        Update: {
          approval_status?: string | null
          centro_code?: string
          created_at?: string | null
          created_by?: string | null
          document_hash?: string | null
          document_path?: string | null
          due_date?: string | null
          entry_id?: string | null
          file_name?: string | null
          file_path?: string | null
          id?: string
          invoice_date?: string
          invoice_number?: string
          job_id?: string | null
          notes?: string | null
          ocr_confidence?: number | null
          ocr_confidence_notes?: string[] | null
          ocr_cost_estimate_eur?: number | null
          ocr_engine?: string | null
          ocr_extracted_data?: Json | null
          ocr_merge_notes?: string[] | null
          ocr_ms_mindee?: number | null
          ocr_ms_openai?: number | null
          ocr_pages?: number | null
          ocr_payload?: Json | null
          ocr_processing_time_ms?: number | null
          ocr_tokens_in?: number | null
          ocr_tokens_out?: number | null
          payment_transaction_id?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejected_reason?: string | null
          requires_accounting_approval?: boolean | null
          requires_manager_approval?: boolean | null
          status?: string | null
          subtotal?: number | null
          supplier_id?: string | null
          tax_total?: number | null
          total?: number
          updated_at?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
          verifactu_hash?: string | null
          verifactu_verified?: boolean | null
          verifactu_verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_received_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "accounting_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_received_payment_transaction_id_fkey"
            columns: ["payment_transaction_id"]
            isOneToOne: false
            referencedRelation: "bank_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_received_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_source: {
        Row: {
          created_at: string
          entry_id: string
          hash: string | null
          id: string
          id_externo: string
          import_run_id: string | null
          source: string
        }
        Insert: {
          created_at?: string
          entry_id: string
          hash?: string | null
          id?: string
          id_externo: string
          import_run_id?: string | null
          source: string
        }
        Update: {
          created_at?: string
          entry_id?: string
          hash?: string | null
          id?: string
          id_externo?: string
          import_run_id?: string | null
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_source_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "accounting_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_source_import_run_id_fkey"
            columns: ["import_run_id"]
            isOneToOne: false
            referencedRelation: "import_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          active: boolean
          created_at: string
          id: string
          organization_id: string | null
          restaurant_id: string | null
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          organization_id?: string | null
          restaurant_id?: string | null
          role: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          organization_id?: string | null
          restaurant_id?: string | null
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "franchisees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["id"]
          },
        ]
      }
      mindee_jobs: {
        Row: {
          alias: string | null
          confidence_score: number | null
          created_at: string | null
          error_message: string | null
          fields: Json | null
          id: string
          job_id: string
          model_id: string | null
          payload: Json | null
          polling_url: string | null
          processed_at: string | null
          result_url: string | null
          status: string
          webhook_received: boolean | null
          webhook_received_at: string | null
        }
        Insert: {
          alias?: string | null
          confidence_score?: number | null
          created_at?: string | null
          error_message?: string | null
          fields?: Json | null
          id?: string
          job_id: string
          model_id?: string | null
          payload?: Json | null
          polling_url?: string | null
          processed_at?: string | null
          result_url?: string | null
          status?: string
          webhook_received?: boolean | null
          webhook_received_at?: string | null
        }
        Update: {
          alias?: string | null
          confidence_score?: number | null
          created_at?: string | null
          error_message?: string | null
          fields?: Json | null
          id?: string
          job_id?: string
          model_id?: string | null
          payload?: Json | null
          polling_url?: string | null
          processed_at?: string | null
          result_url?: string | null
          status?: string
          webhook_received?: boolean | null
          webhook_received_at?: string | null
        }
        Relationships: []
      }
      ocr_circuit_breaker: {
        Row: {
          created_at: string | null
          engine: string
          error_type: string | null
          failure_count: number
          last_failure_at: string | null
          last_success_at: string | null
          next_retry_at: string | null
          state: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          engine: string
          error_type?: string | null
          failure_count?: number
          last_failure_at?: string | null
          last_success_at?: string | null
          next_retry_at?: string | null
          state: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          engine?: string
          error_type?: string | null
          failure_count?: number
          last_failure_at?: string | null
          last_success_at?: string | null
          next_retry_at?: string | null
          state?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      ocr_logs: {
        Row: {
          created_at: string
          engine: string | null
          event: string
          id: string
          invoice_id: string | null
          message: string
          meta: Json | null
        }
        Insert: {
          created_at?: string
          engine?: string | null
          event: string
          id?: string
          invoice_id?: string | null
          message: string
          meta?: Json | null
        }
        Update: {
          created_at?: string
          engine?: string | null
          event?: string
          id?: string
          invoice_id?: string | null
          message?: string
          meta?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "ocr_logs_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices_received"
            referencedColumns: ["id"]
          },
        ]
      }
      ocr_processing_log: {
        Row: {
          confidence: number | null
          cost_estimate_eur: number | null
          created_at: string
          created_by: string | null
          document_path: string
          engine: string | null
          extracted_data: Json | null
          id: string
          invoice_id: string | null
          ms_mindee: number | null
          ms_openai: number | null
          ocr_provider: string
          pages: number | null
          processing_time_ms: number | null
          raw_response: Json | null
          tokens_in: number | null
          tokens_out: number | null
          user_corrections: Json | null
        }
        Insert: {
          confidence?: number | null
          cost_estimate_eur?: number | null
          created_at?: string
          created_by?: string | null
          document_path: string
          engine?: string | null
          extracted_data?: Json | null
          id?: string
          invoice_id?: string | null
          ms_mindee?: number | null
          ms_openai?: number | null
          ocr_provider?: string
          pages?: number | null
          processing_time_ms?: number | null
          raw_response?: Json | null
          tokens_in?: number | null
          tokens_out?: number | null
          user_corrections?: Json | null
        }
        Update: {
          confidence?: number | null
          cost_estimate_eur?: number | null
          created_at?: string
          created_by?: string | null
          document_path?: string
          engine?: string | null
          extracted_data?: Json | null
          id?: string
          invoice_id?: string | null
          ms_mindee?: number | null
          ms_openai?: number | null
          ocr_provider?: string
          pages?: number | null
          processing_time_ms?: number | null
          raw_response?: Json | null
          tokens_in?: number | null
          tokens_out?: number | null
          user_corrections?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "ocr_processing_log_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices_received"
            referencedColumns: ["id"]
          },
        ]
      }
      ocr_runs: {
        Row: {
          cost_estimate_eur: number | null
          created_at: string
          duration_ms: number | null
          engine: string
          id: string
          invoice_id: string
          pages: number | null
          payload: Json | null
          tokens_in: number | null
          tokens_out: number | null
        }
        Insert: {
          cost_estimate_eur?: number | null
          created_at?: string
          duration_ms?: number | null
          engine: string
          id?: string
          invoice_id: string
          pages?: number | null
          payload?: Json | null
          tokens_in?: number | null
          tokens_out?: number | null
        }
        Update: {
          cost_estimate_eur?: number | null
          created_at?: string
          duration_ms?: number | null
          engine?: string
          id?: string
          invoice_id?: string
          pages?: number | null
          payload?: Json | null
          tokens_in?: number | null
          tokens_out?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ocr_runs_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices_received"
            referencedColumns: ["id"]
          },
        ]
      }
      ocr_webhook_deliveries: {
        Row: {
          body: Json | null
          headers: Json | null
          job_id: string
          received_at: string
          signature_valid: boolean | null
          status: string
        }
        Insert: {
          body?: Json | null
          headers?: Json | null
          job_id: string
          received_at?: string
          signature_valid?: boolean | null
          status?: string
        }
        Update: {
          body?: Json | null
          headers?: Json | null
          job_id?: string
          received_at?: string
          signature_valid?: boolean | null
          status?: string
        }
        Relationships: []
      }
      organization_settings: {
        Row: {
          created_at: string
          email_remitente_email: string | null
          email_remitente_nombre: string | null
          id: string
          nominas_columnas_requeridas: Json | null
          nominas_formato_esperado: string | null
          orquest_base_url: string | null
          orquest_default_service_id: string | null
          orquest_periodo_politica: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          email_remitente_email?: string | null
          email_remitente_nombre?: string | null
          id?: string
          nominas_columnas_requeridas?: Json | null
          nominas_formato_esperado?: string | null
          orquest_base_url?: string | null
          orquest_default_service_id?: string | null
          orquest_periodo_politica?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          email_remitente_email?: string | null
          email_remitente_nombre?: string | null
          id?: string
          nominas_columnas_requeridas?: Json | null
          nominas_formato_esperado?: string | null
          orquest_base_url?: string | null
          orquest_default_service_id?: string | null
          orquest_periodo_politica?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      orquest_latency_logs: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          latency_ms: number
          method: string
          status_code: number
          success: boolean
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          latency_ms: number
          method?: string
          status_code: number
          success: boolean
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          latency_ms?: number
          method?: string
          status_code?: number
          success?: boolean
        }
        Relationships: []
      }
      orquest_services: {
        Row: {
          datos_completos: Json | null
          franchisee_id: string | null
          id: string
          latitud: number | null
          longitud: number | null
          nombre: string
          updated_at: string | null
          zona_horaria: string | null
        }
        Insert: {
          datos_completos?: Json | null
          franchisee_id?: string | null
          id: string
          latitud?: number | null
          longitud?: number | null
          nombre: string
          updated_at?: string | null
          zona_horaria?: string | null
        }
        Update: {
          datos_completos?: Json | null
          franchisee_id?: string | null
          id?: string
          latitud?: number | null
          longitud?: number | null
          nombre?: string
          updated_at?: string | null
          zona_horaria?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orquest_services_franchisee_id_fkey"
            columns: ["franchisee_id"]
            isOneToOne: false
            referencedRelation: "franchisees"
            referencedColumns: ["id"]
          },
        ]
      }
      orquest_services_sync_logs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          errors: Json | null
          franchisees_failed: number | null
          franchisees_succeeded: number | null
          id: string
          results: Json | null
          started_at: string | null
          status: string | null
          total_franchisees: number | null
          total_services: number | null
          trigger_source: string | null
          triggered_by: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          errors?: Json | null
          franchisees_failed?: number | null
          franchisees_succeeded?: number | null
          id?: string
          results?: Json | null
          started_at?: string | null
          status?: string | null
          total_franchisees?: number | null
          total_services?: number | null
          trigger_source?: string | null
          triggered_by?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          errors?: Json | null
          franchisees_failed?: number | null
          franchisees_succeeded?: number | null
          id?: string
          results?: Json | null
          started_at?: string | null
          status?: string | null
          total_franchisees?: number | null
          total_services?: number | null
          trigger_source?: string | null
          triggered_by?: string | null
        }
        Relationships: []
      }
      payment_terms: {
        Row: {
          amount: number
          bank_account_id: string | null
          centro_code: string
          concept: string
          created_at: string
          document_type: string
          due_date: string
          id: string
          invoice_id: string | null
          invoice_type: string | null
          notes: string | null
          paid_amount: number | null
          paid_date: string | null
          remittance_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          bank_account_id?: string | null
          centro_code: string
          concept: string
          created_at?: string
          document_type: string
          due_date: string
          id?: string
          invoice_id?: string | null
          invoice_type?: string | null
          notes?: string | null
          paid_amount?: number | null
          paid_date?: string | null
          remittance_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          bank_account_id?: string | null
          centro_code?: string
          concept?: string
          created_at?: string
          document_type?: string
          due_date?: string
          id?: string
          invoice_id?: string | null
          invoice_type?: string | null
          notes?: string | null
          paid_amount?: number | null
          paid_date?: string | null
          remittance_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_terms_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      payrolls: {
        Row: {
          coste_total: number | null
          created_at: string | null
          desglose_costes: Json | null
          employee_id: string
          horas_formacion: number | null
          horas_trabajadas: number | null
          horas_vacaciones: number | null
          id: string
          periodo_fin: string
          periodo_inicio: string
        }
        Insert: {
          coste_total?: number | null
          created_at?: string | null
          desglose_costes?: Json | null
          employee_id: string
          horas_formacion?: number | null
          horas_trabajadas?: number | null
          horas_vacaciones?: number | null
          id?: string
          periodo_fin: string
          periodo_inicio: string
        }
        Update: {
          coste_total?: number | null
          created_at?: string | null
          desglose_costes?: Json | null
          employee_id?: string
          horas_formacion?: number | null
          horas_trabajadas?: number | null
          horas_vacaciones?: number | null
          id?: string
          periodo_fin?: string
          periodo_inicio?: string
        }
        Relationships: [
          {
            foreignKeyName: "payrolls_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      pl_lines: {
        Row: {
          category: string
          code: string
          created_at: string
          display_order: number
          id: string
          is_total: boolean | null
          name: string
          parent_code: string | null
          updated_at: string
        }
        Insert: {
          category: string
          code: string
          created_at?: string
          display_order?: number
          id?: string
          is_total?: boolean | null
          name: string
          parent_code?: string | null
          updated_at?: string
        }
        Update: {
          category?: string
          code?: string
          created_at?: string
          display_order?: number
          id?: string
          is_total?: boolean | null
          name?: string
          parent_code?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      pl_manual_adjustments: {
        Row: {
          adjustment_amount: number
          centro_code: string
          company_id: string | null
          created_at: string | null
          created_by: string | null
          id: string
          notes: string | null
          period_date: string
          rubric_code: string
          template_code: string
          updated_at: string | null
        }
        Insert: {
          adjustment_amount?: number
          centro_code: string
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          period_date: string
          rubric_code: string
          template_code: string
          updated_at?: string | null
        }
        Update: {
          adjustment_amount?: number
          centro_code?: string
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          period_date?: string
          rubric_code?: string
          template_code?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pl_manual_adjustments_centro_code_fkey"
            columns: ["centro_code"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["codigo"]
          },
          {
            foreignKeyName: "pl_manual_adjustments_centro_code_fkey"
            columns: ["centro_code"]
            isOneToOne: false
            referencedRelation: "v_user_memberships"
            referencedColumns: ["restaurant_code"]
          },
          {
            foreignKeyName: "pl_manual_adjustments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      pl_rubrics: {
        Row: {
          code: string
          created_at: string
          formula: string | null
          id: string
          is_total: boolean
          level: number
          name: string
          notes: string | null
          parent_code: string | null
          sign: string
          sort: number
          template_id: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          formula?: string | null
          id?: string
          is_total?: boolean
          level: number
          name: string
          notes?: string | null
          parent_code?: string | null
          sign?: string
          sort: number
          template_id: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          formula?: string | null
          id?: string
          is_total?: boolean
          level?: number
          name?: string
          notes?: string | null
          parent_code?: string | null
          sign?: string
          sort?: number
          template_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pl_rubrics_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "pl_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      pl_rules: {
        Row: {
          account: string | null
          account_from: string | null
          account_like: string | null
          account_to: string | null
          centre_id: string | null
          channel: string | null
          created_at: string
          group_code: string | null
          id: string
          match_kind: string
          notes: string | null
          priority: number
          rubric_code: string
          template_id: string
          updated_at: string
        }
        Insert: {
          account?: string | null
          account_from?: string | null
          account_like?: string | null
          account_to?: string | null
          centre_id?: string | null
          channel?: string | null
          created_at?: string
          group_code?: string | null
          id?: string
          match_kind: string
          notes?: string | null
          priority?: number
          rubric_code: string
          template_id: string
          updated_at?: string
        }
        Update: {
          account?: string | null
          account_from?: string | null
          account_like?: string | null
          account_to?: string | null
          centre_id?: string | null
          channel?: string | null
          created_at?: string
          group_code?: string | null
          id?: string
          match_kind?: string
          notes?: string | null
          priority?: number
          rubric_code?: string
          template_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pl_rules_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "pl_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      pl_templates: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      ponto_account_balances: {
        Row: {
          account_id: string
          available: number | null
          balance_date: string
          created_at: string
          current_balance: number | null
          id: string
          raw_json: Json | null
        }
        Insert: {
          account_id: string
          available?: number | null
          balance_date: string
          created_at?: string
          current_balance?: number | null
          id?: string
          raw_json?: Json | null
        }
        Update: {
          account_id?: string
          available?: number | null
          balance_date?: string
          created_at?: string
          current_balance?: number | null
          id?: string
          raw_json?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "ponto_account_balances_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "ponto_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      ponto_accounts: {
        Row: {
          account_type: string | null
          connection_id: string
          created_at: string
          currency: string | null
          holder: string | null
          iban: string | null
          id: string
          name: string | null
          raw_json: Json | null
          status: string | null
          updated_at: string
        }
        Insert: {
          account_type?: string | null
          connection_id: string
          created_at?: string
          currency?: string | null
          holder?: string | null
          iban?: string | null
          id: string
          name?: string | null
          raw_json?: Json | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          account_type?: string | null
          connection_id?: string
          created_at?: string
          currency?: string | null
          holder?: string | null
          iban?: string | null
          id?: string
          name?: string | null
          raw_json?: Json | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ponto_accounts_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "ponto_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      ponto_connections: {
        Row: {
          access_token_enc: string
          centro_code: string
          consent_reference: string | null
          created_at: string
          id: string
          institution_id: string
          institution_name: string | null
          refresh_token_enc: string | null
          scope: string | null
          status: string
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          access_token_enc: string
          centro_code: string
          consent_reference?: string | null
          created_at?: string
          id?: string
          institution_id: string
          institution_name?: string | null
          refresh_token_enc?: string | null
          scope?: string | null
          status?: string
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          access_token_enc?: string
          centro_code?: string
          consent_reference?: string | null
          created_at?: string
          id?: string
          institution_id?: string
          institution_name?: string | null
          refresh_token_enc?: string | null
          scope?: string | null
          status?: string
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ponto_connections_centro_code_fkey"
            columns: ["centro_code"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["codigo"]
          },
          {
            foreignKeyName: "ponto_connections_centro_code_fkey"
            columns: ["centro_code"]
            isOneToOne: false
            referencedRelation: "v_user_memberships"
            referencedColumns: ["restaurant_code"]
          },
        ]
      }
      ponto_sync_log: {
        Row: {
          accounts_synced: number | null
          completed_at: string | null
          connection_id: string
          details: Json | null
          duration_ms: number | null
          error_message: string | null
          id: string
          started_at: string
          status: string
          sync_type: string
          transactions_synced: number | null
        }
        Insert: {
          accounts_synced?: number | null
          completed_at?: string | null
          connection_id: string
          details?: Json | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          started_at?: string
          status: string
          sync_type: string
          transactions_synced?: number | null
        }
        Update: {
          accounts_synced?: number | null
          completed_at?: string | null
          connection_id?: string
          details?: Json | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          started_at?: string
          status?: string
          sync_type?: string
          transactions_synced?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ponto_sync_log_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "ponto_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      ponto_transactions: {
        Row: {
          account_id: string
          amount: number
          booking_date: string | null
          category: string | null
          counterparty: string | null
          created_at: string
          currency: string | null
          hash_dedup: string | null
          id: string
          raw_json: Json | null
          remittance_info: string | null
          value_date: string | null
        }
        Insert: {
          account_id: string
          amount: number
          booking_date?: string | null
          category?: string | null
          counterparty?: string | null
          created_at?: string
          currency?: string | null
          hash_dedup?: string | null
          id: string
          raw_json?: Json | null
          remittance_info?: string | null
          value_date?: string | null
        }
        Update: {
          account_id?: string
          amount?: number
          booking_date?: string | null
          category?: string | null
          counterparty?: string | null
          created_at?: string
          currency?: string | null
          hash_dedup?: string | null
          id?: string
          raw_json?: Json | null
          remittance_info?: string | null
          value_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ponto_transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "ponto_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          apellidos: string | null
          created_at: string | null
          email: string | null
          id: string
          nombre: string | null
          theme: string | null
          updated_at: string | null
        }
        Insert: {
          apellidos?: string | null
          created_at?: string | null
          email?: string | null
          id: string
          nombre?: string | null
          theme?: string | null
          updated_at?: string | null
        }
        Update: {
          apellidos?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          nombre?: string | null
          theme?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          actual_amount: number | null
          budget_amount: number | null
          centro_code: string
          client_name: string | null
          code: string
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          name: string
          start_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          actual_amount?: number | null
          budget_amount?: number | null
          centro_code: string
          client_name?: string | null
          code: string
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          name: string
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          actual_amount?: number | null
          budget_amount?: number | null
          centro_code?: string
          client_name?: string | null
          code?: string
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          name?: string
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      receipts: {
        Row: {
          amount: number | null
          category: string | null
          created_at: string
          currency: string | null
          description: string | null
          file_name: string
          file_url: string
          id: string
          items: Json | null
          notes: string | null
          payment_method: string | null
          receipt_date: string | null
          receipt_number: string | null
          receiver_address: string | null
          receiver_name: string | null
          receiver_tax_id: string | null
          subtotal: number | null
          tax_amount: number | null
          tax_rate: number | null
          updated_at: string
          user_id: string | null
          vendor_address: string | null
          vendor_name: string | null
          vendor_tax_id: string | null
        }
        Insert: {
          amount?: number | null
          category?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          file_name: string
          file_url: string
          id?: string
          items?: Json | null
          notes?: string | null
          payment_method?: string | null
          receipt_date?: string | null
          receipt_number?: string | null
          receiver_address?: string | null
          receiver_name?: string | null
          receiver_tax_id?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          tax_rate?: number | null
          updated_at?: string
          user_id?: string | null
          vendor_address?: string | null
          vendor_name?: string | null
          vendor_tax_id?: string | null
        }
        Update: {
          amount?: number | null
          category?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          file_name?: string
          file_url?: string
          id?: string
          items?: Json | null
          notes?: string | null
          payment_method?: string | null
          receipt_date?: string | null
          receipt_number?: string | null
          receiver_address?: string | null
          receiver_name?: string | null
          receiver_tax_id?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          tax_rate?: number | null
          updated_at?: string
          user_id?: string | null
          vendor_address?: string | null
          vendor_name?: string | null
          vendor_tax_id?: string | null
        }
        Relationships: []
      }
      reconciliation_matches: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          confidence_score: number | null
          created_at: string | null
          id: string
          match_id: string
          match_type: string
          matching_rules: Json | null
          status: string | null
          transaction_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          match_id: string
          match_type: string
          matching_rules?: Json | null
          status?: string | null
          transaction_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          match_id?: string
          match_type?: string
          matching_rules?: Json | null
          status?: string | null
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reconciliation_matches_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "bank_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      reconciliations: {
        Row: {
          bank_account_id: string
          book_balance: number
          created_at: string | null
          difference: number
          id: string
          is_reconciled: boolean | null
          notes: string | null
          reconciled_at: string | null
          reconciled_by: string | null
          reconciliation_date: string
          statement_balance: number
        }
        Insert: {
          bank_account_id: string
          book_balance: number
          created_at?: string | null
          difference: number
          id?: string
          is_reconciled?: boolean | null
          notes?: string | null
          reconciled_at?: string | null
          reconciled_by?: string | null
          reconciliation_date: string
          statement_balance: number
        }
        Update: {
          bank_account_id?: string
          book_balance?: number
          created_at?: string | null
          difference?: number
          id?: string
          is_reconciled?: boolean | null
          notes?: string | null
          reconciled_at?: string | null
          reconciled_by?: string | null
          reconciliation_date?: string
          statement_balance?: number
        }
        Relationships: [
          {
            foreignKeyName: "reconciliations_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_cost_centres: {
        Row: {
          a3_centro_code: string
          activo: boolean
          centro_id: string
          created_at: string
          descripcion: string | null
          id: string
          updated_at: string
        }
        Insert: {
          a3_centro_code: string
          activo?: boolean
          centro_id: string
          created_at?: string
          descripcion?: string | null
          id?: string
          updated_at?: string
        }
        Update: {
          a3_centro_code?: string
          activo?: boolean
          centro_id?: string
          created_at?: string
          descripcion?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_cost_centres_centro_id_fkey"
            columns: ["centro_id"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_services: {
        Row: {
          activo: boolean
          centro_id: string
          created_at: string
          descripcion: string | null
          id: string
          orquest_service_id: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          centro_id: string
          created_at?: string
          descripcion?: string | null
          id?: string
          orquest_service_id: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          centro_id?: string
          created_at?: string
          descripcion?: string | null
          id?: string
          orquest_service_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_services_centro_id_fkey"
            columns: ["centro_id"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string | null
          description: string | null
          granted: boolean
          id: string
          permission: Database["public"]["Enums"]["permission_action"]
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          granted?: boolean
          id?: string
          permission: Database["public"]["Enums"]["permission_action"]
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          granted?: boolean
          id?: string
          permission?: Database["public"]["Enums"]["permission_action"]
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
        }
        Relationships: []
      }
      schedules: {
        Row: {
          created_at: string | null
          employee_id: string
          fecha: string
          hora_fin: string
          hora_inicio: string
          horas_planificadas: number
          id: string
          service_id: string | null
          tipo_asignacion: string | null
        }
        Insert: {
          created_at?: string | null
          employee_id: string
          fecha: string
          hora_fin: string
          hora_inicio: string
          horas_planificadas: number
          id?: string
          service_id?: string | null
          tipo_asignacion?: string | null
        }
        Update: {
          created_at?: string | null
          employee_id?: string
          fecha?: string
          hora_fin?: string
          hora_inicio?: string
          horas_planificadas?: number
          id?: string
          service_id?: string | null
          tipo_asignacion?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schedules_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      series_contables: {
        Row: {
          centro_code: string
          company_id: string | null
          created_at: string
          descripcion: string | null
          ejercicio: number
          id: string
          next_number: number
          serie: string
          updated_at: string
        }
        Insert: {
          centro_code: string
          company_id?: string | null
          created_at?: string
          descripcion?: string | null
          ejercicio: number
          id?: string
          next_number?: number
          serie?: string
          updated_at?: string
        }
        Update: {
          centro_code?: string
          company_id?: string | null
          created_at?: string
          descripcion?: string | null
          ejercicio?: number
          id?: string
          next_number?: number
          serie?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "series_contables_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      servicios_orquest: {
        Row: {
          created_at: string | null
          datos_completos: Json | null
          franchisee_id: string | null
          id: string
          latitud: number | null
          longitud: number | null
          nombre: string
          updated_at: string | null
          zona_horaria: string | null
        }
        Insert: {
          created_at?: string | null
          datos_completos?: Json | null
          franchisee_id?: string | null
          id: string
          latitud?: number | null
          longitud?: number | null
          nombre: string
          updated_at?: string | null
          zona_horaria?: string | null
        }
        Update: {
          created_at?: string | null
          datos_completos?: Json | null
          franchisee_id?: string | null
          id?: string
          latitud?: number | null
          longitud?: number | null
          nombre?: string
          updated_at?: string | null
          zona_horaria?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "servicios_orquest_franchisee_id_fkey"
            columns: ["franchisee_id"]
            isOneToOne: false
            referencedRelation: "franchisees"
            referencedColumns: ["id"]
          },
        ]
      }
      stg_diario: {
        Row: {
          centro_code: string | null
          concepto: string | null
          created_at: string
          cuenta: string
          debe: number | null
          documento: string | null
          fecha: string
          haber: number | null
          hash: string | null
          id: string
          id_externo: string
          import_run_id: string
          status: string | null
          validation_errors: Json | null
        }
        Insert: {
          centro_code?: string | null
          concepto?: string | null
          created_at?: string
          cuenta: string
          debe?: number | null
          documento?: string | null
          fecha: string
          haber?: number | null
          hash?: string | null
          id?: string
          id_externo: string
          import_run_id: string
          status?: string | null
          validation_errors?: Json | null
        }
        Update: {
          centro_code?: string | null
          concepto?: string | null
          created_at?: string
          cuenta?: string
          debe?: number | null
          documento?: string | null
          fecha?: string
          haber?: number | null
          hash?: string | null
          id?: string
          id_externo?: string
          import_run_id?: string
          status?: string | null
          validation_errors?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "stg_diario_import_run_id_fkey"
            columns: ["import_run_id"]
            isOneToOne: false
            referencedRelation: "import_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      stg_iva_emitidas: {
        Row: {
          base: number
          centro_code: string
          created_at: string | null
          cuota: number
          fecha: string
          hash: string | null
          id: string
          id_externo: string
          import_run_id: string
          nif_cliente: string | null
          nombre_cliente: string
          numero: string
          status: string | null
          tipo: number
          total: number
          validation_errors: Json | null
        }
        Insert: {
          base: number
          centro_code: string
          created_at?: string | null
          cuota: number
          fecha: string
          hash?: string | null
          id?: string
          id_externo: string
          import_run_id: string
          nif_cliente?: string | null
          nombre_cliente: string
          numero: string
          status?: string | null
          tipo: number
          total: number
          validation_errors?: Json | null
        }
        Update: {
          base?: number
          centro_code?: string
          created_at?: string | null
          cuota?: number
          fecha?: string
          hash?: string | null
          id?: string
          id_externo?: string
          import_run_id?: string
          nif_cliente?: string | null
          nombre_cliente?: string
          numero?: string
          status?: string | null
          tipo?: number
          total?: number
          validation_errors?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "stg_iva_emitidas_import_run_id_fkey"
            columns: ["import_run_id"]
            isOneToOne: false
            referencedRelation: "import_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      stg_iva_recibidas: {
        Row: {
          base: number
          centro_code: string
          created_at: string | null
          cuota: number
          fecha: string
          hash: string | null
          id: string
          id_externo: string
          import_run_id: string
          nif_proveedor: string | null
          nombre_proveedor: string
          numero: string
          status: string | null
          tipo: number
          total: number
          validation_errors: Json | null
        }
        Insert: {
          base: number
          centro_code: string
          created_at?: string | null
          cuota: number
          fecha: string
          hash?: string | null
          id?: string
          id_externo: string
          import_run_id: string
          nif_proveedor?: string | null
          nombre_proveedor: string
          numero: string
          status?: string | null
          tipo: number
          total: number
          validation_errors?: Json | null
        }
        Update: {
          base?: number
          centro_code?: string
          created_at?: string | null
          cuota?: number
          fecha?: string
          hash?: string | null
          id?: string
          id_externo?: string
          import_run_id?: string
          nif_proveedor?: string | null
          nombre_proveedor?: string
          numero?: string
          status?: string | null
          tipo?: number
          total?: number
          validation_errors?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "stg_iva_recibidas_import_run_id_fkey"
            columns: ["import_run_id"]
            isOneToOne: false
            referencedRelation: "import_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      stg_sumas_saldos: {
        Row: {
          centro_code: string | null
          created_at: string | null
          cuenta: string
          debe_acum: number | null
          haber_acum: number | null
          hash: string | null
          id: string
          id_externo: string
          import_run_id: string
          periodo: string
          saldo_acreedor: number | null
          saldo_deudor: number | null
          status: string | null
          validation_errors: Json | null
        }
        Insert: {
          centro_code?: string | null
          created_at?: string | null
          cuenta: string
          debe_acum?: number | null
          haber_acum?: number | null
          hash?: string | null
          id?: string
          id_externo: string
          import_run_id: string
          periodo: string
          saldo_acreedor?: number | null
          saldo_deudor?: number | null
          status?: string | null
          validation_errors?: Json | null
        }
        Update: {
          centro_code?: string | null
          created_at?: string | null
          cuenta?: string
          debe_acum?: number | null
          haber_acum?: number | null
          hash?: string | null
          id?: string
          id_externo?: string
          import_run_id?: string
          periodo?: string
          saldo_acreedor?: number | null
          saldo_deudor?: number | null
          status?: string | null
          validation_errors?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "stg_sumas_saldos_import_run_id_fkey"
            columns: ["import_run_id"]
            isOneToOne: false
            referencedRelation: "import_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          active: boolean | null
          address: string | null
          city: string | null
          commercial_name: string | null
          country: string | null
          created_at: string | null
          default_account_code: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          payment_terms: number | null
          phone: string | null
          postal_code: string | null
          tax_id: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          address?: string | null
          city?: string | null
          commercial_name?: string | null
          country?: string | null
          created_at?: string | null
          default_account_code?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          payment_terms?: number | null
          phone?: string | null
          postal_code?: string | null
          tax_id: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          address?: string | null
          city?: string | null
          commercial_name?: string | null
          country?: string | null
          created_at?: string | null
          default_account_code?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          payment_terms?: number | null
          phone?: string | null
          postal_code?: string | null
          tax_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      sync_logs: {
        Row: {
          completed_at: string | null
          created_at: string
          error_rows: number | null
          errors: Json | null
          id: string
          inserted_rows: number | null
          params: Json
          processed_rows: number | null
          started_at: string
          status: string
          sync_type: string
          total_rows: number | null
          trigger_source: string | null
          triggered_by: string | null
          updated_rows: number | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_rows?: number | null
          errors?: Json | null
          id?: string
          inserted_rows?: number | null
          params?: Json
          processed_rows?: number | null
          started_at?: string
          status?: string
          sync_type: string
          total_rows?: number | null
          trigger_source?: string | null
          triggered_by?: string | null
          updated_rows?: number | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_rows?: number | null
          errors?: Json | null
          id?: string
          inserted_rows?: number | null
          params?: Json
          processed_rows?: number | null
          started_at?: string
          status?: string
          sync_type?: string
          total_rows?: number | null
          trigger_source?: string | null
          triggered_by?: string | null
          updated_rows?: number | null
        }
        Relationships: []
      }
      system_health_logs: {
        Row: {
          absences_count: number | null
          checked_at: string
          created_at: string
          details: Json | null
          employees_count: number | null
          id: string
          last_sync_at: string | null
          last_sync_status: string | null
          orquest_error: string | null
          orquest_latency_ms: number | null
          orquest_status: string
          overall_status: string
          payrolls_count: number | null
          schedules_count: number | null
          supabase_latency_ms: number | null
          supabase_status: string
        }
        Insert: {
          absences_count?: number | null
          checked_at?: string
          created_at?: string
          details?: Json | null
          employees_count?: number | null
          id?: string
          last_sync_at?: string | null
          last_sync_status?: string | null
          orquest_error?: string | null
          orquest_latency_ms?: number | null
          orquest_status: string
          overall_status: string
          payrolls_count?: number | null
          schedules_count?: number | null
          supabase_latency_ms?: number | null
          supabase_status: string
        }
        Update: {
          absences_count?: number | null
          checked_at?: string
          created_at?: string
          details?: Json | null
          employees_count?: number | null
          id?: string
          last_sync_at?: string | null
          last_sync_status?: string | null
          orquest_error?: string | null
          orquest_latency_ms?: number | null
          orquest_status?: string
          overall_status?: string
          payrolls_count?: number | null
          schedules_count?: number | null
          supabase_latency_ms?: number | null
          supabase_status?: string
        }
        Relationships: []
      }
      tax_codes: {
        Row: {
          account_code_base: string | null
          account_code_fee: string | null
          active: boolean
          code: string
          created_at: string
          description: string
          id: string
          rate: number
          regime: string
          type: string
          updated_at: string
        }
        Insert: {
          account_code_base?: string | null
          account_code_fee?: string | null
          active?: boolean
          code: string
          created_at?: string
          description: string
          id?: string
          rate: number
          regime?: string
          type: string
          updated_at?: string
        }
        Update: {
          account_code_base?: string | null
          account_code_fee?: string | null
          active?: boolean
          code?: string
          created_at?: string
          description?: string
          id?: string
          rate?: number
          regime?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      tax_model_configs: {
        Row: {
          auto_generate: boolean | null
          centro_code: string
          config_data: Json | null
          created_at: string
          id: string
          last_generated_period: string | null
          model_number: string
          period_type: string
          updated_at: string
        }
        Insert: {
          auto_generate?: boolean | null
          centro_code: string
          config_data?: Json | null
          created_at?: string
          id?: string
          last_generated_period?: string | null
          model_number: string
          period_type: string
          updated_at?: string
        }
        Update: {
          auto_generate?: boolean | null
          centro_code?: string
          config_data?: Json | null
          created_at?: string
          id?: string
          last_generated_period?: string | null
          model_number?: string
          period_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_centre_permissions: {
        Row: {
          centro: string
          created_at: string | null
          granted: boolean
          granted_by: string | null
          id: string
          notes: string | null
          permission: Database["public"]["Enums"]["permission_action"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          centro: string
          created_at?: string | null
          granted: boolean
          granted_by?: string | null
          id?: string
          notes?: string | null
          permission: Database["public"]["Enums"]["permission_action"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          centro?: string
          created_at?: string | null
          granted?: boolean
          granted_by?: string | null
          id?: string
          notes?: string | null
          permission?: Database["public"]["Enums"]["permission_action"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          centro: string | null
          created_at: string | null
          franchisee_id: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          centro?: string | null
          created_at?: string | null
          franchisee_id?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          centro?: string | null
          created_at?: string | null
          franchisee_id?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_user_roles_centro"
            columns: ["centro"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["codigo"]
          },
          {
            foreignKeyName: "fk_user_roles_centro"
            columns: ["centro"]
            isOneToOne: false
            referencedRelation: "v_user_memberships"
            referencedColumns: ["restaurant_code"]
          },
          {
            foreignKeyName: "fk_user_roles_franchisee"
            columns: ["franchisee_id"]
            isOneToOne: false
            referencedRelation: "franchisees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_roles_user_profile"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_franchisee_id_fkey"
            columns: ["franchisee_id"]
            isOneToOne: false
            referencedRelation: "franchisees"
            referencedColumns: ["id"]
          },
        ]
      }
      verifactu_logs: {
        Row: {
          chain_position: number
          created_at: string | null
          created_by: string | null
          hash_sha256: string
          id: string
          invoice_date: string
          invoice_id: string
          invoice_number: string
          invoice_type: string
          metadata: Json | null
          previous_hash: string | null
          signature: string | null
          signature_algorithm: string | null
          signature_timestamp: string | null
          verification_date: string | null
          verified: boolean | null
        }
        Insert: {
          chain_position: number
          created_at?: string | null
          created_by?: string | null
          hash_sha256: string
          id?: string
          invoice_date: string
          invoice_id: string
          invoice_number: string
          invoice_type: string
          metadata?: Json | null
          previous_hash?: string | null
          signature?: string | null
          signature_algorithm?: string | null
          signature_timestamp?: string | null
          verification_date?: string | null
          verified?: boolean | null
        }
        Update: {
          chain_position?: number
          created_at?: string | null
          created_by?: string | null
          hash_sha256?: string
          id?: string
          invoice_date?: string
          invoice_id?: string
          invoice_number?: string
          invoice_type?: string
          metadata?: Json | null
          previous_hash?: string | null
          signature?: string | null
          signature_algorithm?: string | null
          signature_timestamp?: string | null
          verification_date?: string | null
          verified?: boolean | null
        }
        Relationships: []
      }
    }
    Views: {
      mv_gl_ledger_month: {
        Row: {
          account_code: string | null
          amount: number | null
          centro_code: string | null
          company_id: string | null
          period_month: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounting_entries_centro_code_fkey"
            columns: ["centro_code"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["codigo"]
          },
          {
            foreignKeyName: "accounting_entries_centro_code_fkey"
            columns: ["centro_code"]
            isOneToOne: false
            referencedRelation: "v_user_memberships"
            referencedColumns: ["restaurant_code"]
          },
          {
            foreignKeyName: "centres_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      mv_ocr_metrics: {
        Row: {
          avg_confidence: number | null
          avg_cost_eur: number | null
          avg_pages: number | null
          avg_processing_time_ms: number | null
          avg_tokens_in: number | null
          avg_tokens_out: number | null
          engine: string | null
          total_cost_eur: number | null
          total_invocations: number | null
          total_pages: number | null
          total_tokens_in: number | null
          total_tokens_out: number | null
        }
        Relationships: []
      }
      v_companies_reconstruction_report: {
        Row: {
          metric: string | null
          value: string | null
        }
        Relationships: []
      }
      v_ocr_metrics: {
        Row: {
          avg_confidence: number | null
          avg_duration_ms: number | null
          centro_code: string | null
          error_count: number | null
          invoice_status: string | null
          pending_count: number | null
          total_cost_eur: number | null
          total_invoices: number | null
          total_runs: number | null
        }
        Relationships: []
      }
      v_pl_rubric_month: {
        Row: {
          amount: number | null
          centro_code: string | null
          company_id: string | null
          period_month: string | null
          rubric_code: string | null
          template_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounting_entries_centro_code_fkey"
            columns: ["centro_code"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["codigo"]
          },
          {
            foreignKeyName: "accounting_entries_centro_code_fkey"
            columns: ["centro_code"]
            isOneToOne: false
            referencedRelation: "v_user_memberships"
            referencedColumns: ["restaurant_code"]
          },
          {
            foreignKeyName: "centres_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pl_rules_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "pl_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      v_pl_rule_winner: {
        Row: {
          account_code: string | null
          centro_code: string | null
          company_id: string | null
          period_month: string | null
          priority: number | null
          rubric_code: string | null
          template_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounting_entries_centro_code_fkey"
            columns: ["centro_code"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["codigo"]
          },
          {
            foreignKeyName: "accounting_entries_centro_code_fkey"
            columns: ["centro_code"]
            isOneToOne: false
            referencedRelation: "v_user_memberships"
            referencedColumns: ["restaurant_code"]
          },
          {
            foreignKeyName: "centres_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pl_rules_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "pl_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      v_user_centres: {
        Row: {
          centro_code: string | null
          centro_id: string | null
          centro_nombre: string | null
          orquest_service_id: string | null
          role: Database["public"]["Enums"]["app_role"] | null
          user_id: string | null
        }
        Relationships: []
      }
      v_user_memberships: {
        Row: {
          active: boolean | null
          created_at: string | null
          membership_id: string | null
          organization_email: string | null
          organization_id: string | null
          organization_name: string | null
          organization_tax_id: string | null
          restaurant_active: boolean | null
          restaurant_address: string | null
          restaurant_city: string | null
          restaurant_code: string | null
          restaurant_id: string | null
          restaurant_name: string | null
          role: string | null
          updated_at: string | null
          user_apellidos: string | null
          user_email: string | null
          user_id: string | null
          user_nombre: string | null
        }
        Relationships: [
          {
            foreignKeyName: "memberships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "franchisees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["id"]
          },
        ]
      }
      v_user_restaurants: {
        Row: {
          orquest_service_id: string | null
          restaurant_code: string | null
          restaurant_id: string | null
          restaurant_name: string | null
          role: Database["public"]["Enums"]["app_role"] | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      analyze_reconciliation_patterns: {
        Args: {
          p_bank_account_id: string
          p_centro_code: string
          p_confidence_threshold?: number
          p_min_occurrences?: number
        }
        Returns: Json
      }
      auto_match_bank_transactions: {
        Args: { p_bank_account_id: string; p_limit?: number }
        Returns: {
          confidence_score: number
          matched_id: string
          matched_type: string
          rule_id: string
          transaction_id: string
        }[]
      }
      auto_match_with_rules: {
        Args: {
          p_bank_account_id: string
          p_centro_code?: string
          p_limit?: number
        }
        Returns: Json
      }
      calculate_balance_sheet: {
        Args: { p_centro_code: string; p_fecha_corte: string }
        Returns: {
          balance: number
          grupo: string
          nombre_grupo: string
        }[]
      }
      calculate_balance_sheet_full: {
        Args: {
          p_centro_code: string
          p_fecha_corte: string
          p_nivel?: number
          p_show_zero_balance?: boolean
        }
        Returns: {
          account_type: string
          balance: number
          codigo: string
          nivel: number
          nombre: string
          parent_code: string
        }[]
      }
      calculate_monthly_depreciations: {
        Args: { p_centro_code: string; p_month: number; p_year: number }
        Returns: Json
      }
      calculate_pl_report: {
        Args: {
          p_centro_code?: string
          p_company_id?: string
          p_end_date?: string
          p_start_date?: string
          p_template_code: string
        }
        Returns: {
          amount: number
          is_total: boolean
          level: number
          parent_code: string
          rubric_code: string
          rubric_name: string
          sign: string
          sort: number
        }[]
      }
      calculate_pl_report_accumulated: {
        Args: {
          p_centro_code?: string
          p_company_id?: string
          p_period_date: string
          p_show_accumulated?: boolean
          p_template_code: string
        }
        Returns: {
          amount_period: number
          amount_ytd: number
          is_total: boolean
          level: number
          parent_code: string
          percentage_period: number
          percentage_ytd: number
          rubric_code: string
          rubric_name: string
          sign: string
          sort: number
        }[]
      }
      calculate_pl_report_consolidated: {
        Args: {
          p_centro_codes: string[]
          p_end_date: string
          p_start_date: string
          p_template_code: string
        }
        Returns: {
          amount: number
          is_total: boolean
          level: number
          parent_code: string
          percentage: number
          rubric_code: string
          rubric_name: string
          sign: string
          sort: number
        }[]
      }
      calculate_pl_report_with_adjustments: {
        Args: {
          p_centro_code: string
          p_company_id: string
          p_end_date: string
          p_start_date: string
          p_template_code: string
        }
        Returns: {
          amount_adjustment: number
          amount_calculated: number
          amount_final: number
          is_total: boolean
          level: number
          parent_code: string
          percentage: number
          rubric_code: string
          rubric_name: string
          sign: string
          sort: number
        }[]
      }
      calculate_pnl: {
        Args: {
          p_centro_code: string
          p_end_date: string
          p_start_date: string
        }
        Returns: {
          account_code: string
          account_name: string
          account_type: string
          balance: number
          credit_total: number
          debit_total: number
          level: number
        }[]
      }
      calculate_pyg_pgc: {
        Args: {
          p_centro_code: string
          p_fecha_fin: string
          p_fecha_inicio: string
          p_nivel?: number
          p_show_zero_balance?: boolean
        }
        Returns: {
          cuenta: string
          debe: number
          haber: number
          nivel: number
          nombre: string
          parent_code: string
          porcentaje: number
          saldo: number
        }[]
      }
      calculate_required_approvals: {
        Args: { p_centro_code: string; p_total_amount: number }
        Returns: {
          matching_rule_id: string
          requires_accounting: boolean
          requires_manager: boolean
        }[]
      }
      calculate_trial_balance: {
        Args: {
          p_centro_code: string
          p_company_id?: string
          p_end_date?: string
          p_start_date?: string
        }
        Returns: {
          account_code: string
          account_name: string
          account_type: string
          balance: number
          credit_total: number
          debit_total: number
          level: number
          parent_code: string
        }[]
      }
      calculate_trial_balance_full: {
        Args: {
          p_centro_code: string
          p_company_id?: string
          p_end_date?: string
          p_nivel?: number
          p_show_zero_balance?: boolean
          p_start_date?: string
        }
        Returns: {
          account_code: string
          account_name: string
          account_type: string
          balance: number
          credit_total: number
          debit_total: number
          level: number
          parent_code: string
        }[]
      }
      cleanup_old_data: { Args: never; Returns: undefined }
      contabilizar_asiento: {
        Args: { p_entry_id: string; p_user_id: string }
        Returns: Json
      }
      descontabilizar_asiento: {
        Args: { p_entry_id: string; p_motivo: string; p_user_id: string }
        Returns: Json
      }
      detect_dq_issues: {
        Args: { p_centro?: string; p_end_date: string; p_start_date: string }
        Returns: {
          coste_atipico: number
          empleado_sin_centro: number
          issues_detected: number
          plan_sin_real: number
          real_sin_plan: number
        }[]
      }
      generate_api_key: {
        Args: {
          p_centro_code?: string
          p_expires_at?: string
          p_franchisee_id?: string
          p_name: string
          p_scopes?: Json
        }
        Returns: {
          api_key: string
          key_id: string
          key_prefix: string
        }[]
      }
      generate_closing_entries: {
        Args: {
          p_centro_code: string
          p_closing_date: string
          p_fiscal_year_id: string
        }
        Returns: {
          account_code: string
          account_name: string
          amount: number
          entry_type: string
          movement_type: string
        }[]
      }
      generate_daily_closure_entry: {
        Args: { closure_id: string }
        Returns: string
      }
      generate_invoice_hash: {
        Args: {
          p_invoice_date: string
          p_invoice_number: string
          p_invoice_type: string
          p_previous_hash?: string
          p_total: number
        }
        Returns: string
      }
      generate_modelo_303: {
        Args: { p_centro_code: string; p_quarter: number; p_year: number }
        Returns: Json
      }
      get_centros: {
        Args: never
        Returns: {
          centro: string
        }[]
      }
      get_closing_periods: {
        Args: { p_centro_code?: string; p_year?: number }
        Returns: {
          centro_code: string
          closed_by: string
          closing_date: string
          closing_entry_id: string
          created_at: string
          id: string
          notes: string
          period_month: number
          period_type: string
          period_year: number
          regularization_entry_id: string
          status: string
          updated_at: string
        }[]
      }
      get_cost_center_analysis: {
        Args: {
          p_centro_code: string
          p_end_date: string
          p_start_date: string
        }
        Returns: {
          balance: number
          cost_center_code: string
          cost_center_name: string
          total_credit: number
          total_debit: number
        }[]
      }
      get_cost_metrics: {
        Args: { p_centro?: string; p_end_date: string; p_start_date: string }
        Returns: {
          coste_medio_hora: number
          coste_total: number
          total_horas: number
        }[]
      }
      get_cost_trend_30d: {
        Args: never
        Returns: {
          daily_cost: number
          date: string
          invoice_count: number
        }[]
      }
      get_daily_hours_evolution: {
        Args: { p_centro?: string; p_end_date: string; p_start_date: string }
        Returns: {
          fecha: string
          horas_ausencia: number
          horas_planificadas: number
          horas_trabajadas: number
        }[]
      }
      get_general_ledger: {
        Args: {
          p_account_code?: string
          p_centro_code: string
          p_end_date: string
          p_start_date: string
        }
        Returns: {
          account_code: string
          account_name: string
          balance: number
          credit: number
          debit: number
          description: string
          entry_date: string
          entry_number: number
        }[]
      }
      get_general_ledger_full: {
        Args: {
          p_account_code?: string
          p_centro_code: string
          p_end_date: string
          p_include_zero_balance?: boolean
          p_start_date: string
        }
        Returns: {
          account_code: string
          account_name: string
          balance: number
          credit: number
          debit: number
          description: string
          entry_date: string
          entry_number: number
        }[]
      }
      get_general_ledger_official: {
        Args: {
          p_account_code?: string
          p_centro_code: string
          p_end_date: string
          p_start_date: string
        }
        Returns: {
          account_code: string
          account_name: string
          balance: number
          credit: number
          debit: number
          description: string
          document_ref: string
          entry_date: string
          entry_number: number
          serie: string
        }[]
      }
      get_hours_metrics: {
        Args: { p_centro?: string; p_end_date: string; p_start_date: string }
        Returns: {
          horas_ausencia: number
          horas_planificadas: number
          horas_trabajadas: number
          tasa_absentismo: number
        }[]
      }
      get_iva_summary_303: {
        Args: {
          p_centro_code: string
          p_end_date: string
          p_start_date: string
        }
        Returns: {
          compensaciones_anteriores: number
          resultado_final: number
          resultado_liquidacion: number
          total_base_repercutido: number
          total_base_soportado: number
          total_cuota_deducible: number
          total_cuota_repercutido: number
          total_cuota_soportado: number
        }[]
      }
      get_journal_book: {
        Args: {
          p_centro_code: string
          p_end_date: string
          p_start_date: string
        }
        Returns: {
          account_code: string
          account_name: string
          amount: number
          description: string
          entry_date: string
          entry_id: string
          entry_number: number
          line_number: number
          movement_type: string
          total_credit: number
          total_debit: number
        }[]
      }
      get_journal_book_official: {
        Args: {
          p_centro_code: string
          p_end_date: string
          p_start_date: string
        }
        Returns: {
          account_code: string
          account_name: string
          amount: number
          description: string
          document_ref: string
          entry_date: string
          entry_id: string
          entry_number: number
          line_number: number
          movement_type: string
          posted_at: string
          serie: string
          total_credit: number
          total_debit: number
        }[]
      }
      get_libro_iva_repercutido: {
        Args: {
          p_centro_code: string
          p_end_date: string
          p_start_date: string
        }
        Returns: {
          base_imponible: number
          cliente_nif: string
          cliente_nombre: string
          cuota_iva: number
          fecha: string
          numero_factura: string
          recargo_equivalencia: number
          tipo_iva: number
          tipo_operacion: string
          total_factura: number
        }[]
      }
      get_libro_iva_soportado: {
        Args: {
          p_centro_code: string
          p_end_date: string
          p_start_date: string
        }
        Returns: {
          base_imponible: number
          cuota_deducible: number
          cuota_iva: number
          fecha: string
          numero_factura: string
          proveedor_nif: string
          proveedor_nombre: string
          tipo_iva: number
          tipo_operacion: string
          total_factura: number
        }[]
      }
      get_metrics_by_service: {
        Args: {
          p_centro_code?: string
          p_end_date: string
          p_start_date: string
        }
        Returns: {
          empleados_activos: number
          horas_planificadas: number
          horas_trabajadas: number
          service_descripcion: string
          service_id: string
        }[]
      }
      get_next_entry_number: {
        Args: {
          p_centro_code: string
          p_company_id: string
          p_ejercicio: number
          p_serie?: string
        }
        Returns: number
      }
      get_opening_balances: {
        Args: { p_centro_code: string; p_fiscal_year_id: string }
        Returns: {
          account_code: string
          account_name: string
          balance: number
          movement_type: string
        }[]
      }
      get_page_distribution: {
        Args: never
        Returns: {
          count: number
          page_range: string
        }[]
      }
      get_payment_terms_analysis: {
        Args: { p_centro_code: string; p_date_from: string; p_date_to: string }
        Returns: {
          avg_days_overdue: number
          count_items: number
          due_status: string
          total_amount: number
        }[]
      }
      get_payroll_costs: {
        Args: { p_centro?: string; p_end_date: string; p_start_date: string }
        Returns: {
          coste_medio: number
          coste_total: number
          employee_centro: string
          employee_id: string
          employee_name: string
          horas_formacion: number
          horas_trabajadas: number
          horas_vacaciones: number
        }[]
      }
      get_pl_report: {
        Args: {
          p_centro_code: string
          p_end_date: string
          p_start_date: string
        }
        Returns: {
          amount: number
          category: string
          display_order: number
          is_total: boolean
          line_code: string
          line_name: string
        }[]
      }
      get_planned_vs_actual_costs: {
        Args: { p_centro?: string; p_end_date: string; p_start_date: string }
        Returns: {
          centro: string
          costes_planificados: number
          costes_reales: number
        }[]
      }
      get_project_analysis: {
        Args: { p_centro_code: string; p_project_id?: string }
        Returns: {
          actual_amount: number
          budget_amount: number
          project_code: string
          project_name: string
          status: string
          variance: number
          variance_percent: number
        }[]
      }
      get_restaurants_with_franchisees: {
        Args: never
        Returns: {
          address: string
          city: string
          company_tax_id: string
          country: string
          created_at: string
          franchisee_email: string
          franchisee_id: string
          franchisee_name: string
          id: string
          name: string
          opening_date: string
          postal_code: string
          seating_capacity: string
          site_number: string
          square_meters: string
          state: string
          updated_at: string
        }[]
      }
      get_user_permissions: {
        Args: { _centro?: string; _user_id: string }
        Returns: {
          centro: string
          permission: Database["public"]["Enums"]["permission_action"]
          role: Database["public"]["Enums"]["app_role"]
          source: string
        }[]
      }
      has_permission: {
        Args: {
          _centro?: string
          _permission: Database["public"]["Enums"]["permission_action"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_cache_search_count: {
        Args: { p_cif: string }
        Returns: undefined
      }
      log_ocr_event: {
        Args: {
          p_engine: string
          p_event: string
          p_invoice_id: string
          p_message: string
          p_meta?: Json
        }
        Returns: string
      }
      post_diario_import: { Args: { p_import_run_id: string }; Returns: Json }
      post_iva_emitidas_import: {
        Args: { p_import_run_id: string }
        Returns: Json
      }
      post_iva_recibidas_import: {
        Args: { p_import_run_id: string }
        Returns: Json
      }
      post_sumas_saldos_import: {
        Args: { p_import_run_id: string }
        Returns: Json
      }
      reconstruct_franchisee_relationships: {
        Args: never
        Returns: {
          action_type: string
          franchisee_id: string
          franchisee_name: string
          match_reason: string
          related_id: string
          related_name: string
        }[]
      }
      refresh_gl_ledger_month: { Args: never; Returns: undefined }
      refresh_ocr_metrics: { Args: never; Returns: undefined }
      refresh_user_memberships: { Args: never; Returns: undefined }
      reset_ocr_circuit_breaker: { Args: { p_engine: string }; Returns: Json }
      revoke_api_key: {
        Args: { p_key_id: string; p_reason?: string }
        Returns: boolean
      }
      run_franchisee_reconstruction: { Args: never; Returns: Json }
      search_locations: {
        Args: { limit_results?: number; search_query: string }
        Returns: {
          match_type: string
          municipality_id: number
          municipality_name: string
          postal_code: string
          province_id: number
          province_name: string
        }[]
      }
      set_primary_company: {
        Args: { _centre_id: string; _company_id: string }
        Returns: undefined
      }
      stage_diario_rows: {
        Args: { p_import_run_id: string; p_rows: Json }
        Returns: Json
      }
      stage_iva_emitidas_rows: {
        Args: { p_import_run_id: string; p_rows: Json }
        Returns: Json
      }
      stage_iva_recibidas_rows: {
        Args: { p_import_run_id: string; p_rows: Json }
        Returns: Json
      }
      stage_sumas_saldos_rows: {
        Args: { p_import_run_id: string; p_rows: Json }
        Returns: Json
      }
      start_import: {
        Args: {
          p_centro_code?: string
          p_filename: string
          p_module: string
          p_source: string
        }
        Returns: string
      }
      suggest_reconciliation_matches: {
        Args: { p_centro_code: string; p_transaction_id: string }
        Returns: Json
      }
      undo_reconciliation: {
        Args: { p_transaction_id: string; p_user_id: string }
        Returns: Json
      }
      unmapped_accounts: {
        Args: {
          p_centro_code?: string
          p_company_id?: string
          p_period_month?: string
          p_template_code: string
        }
        Returns: {
          account_code: string
          account_name: string
          amount: number
          centro_code: string
          company_id: string
          period_month: string
        }[]
      }
      upsert_company_with_addresses: {
        Args: {
          p_company_data: Json
          p_company_id: string
          p_fiscal_address: Json
          p_social_address: Json
        }
        Returns: Json
      }
      user_can_access_centro: {
        Args: { _centro_code: string; _user_id: string }
        Returns: boolean
      }
      user_owns_invoice: { Args: { invoice_id: string }; Returns: boolean }
      validate_api_key: {
        Args: {
          p_ip_address?: unknown
          p_key_hash: string
          p_required_scope?: string
        }
        Returns: {
          centro_code: string
          franchisee_id: string
          is_valid: boolean
          key_id: string
          scopes: Json
          user_id: string
        }[]
      }
      verify_hash_chain: {
        Args: { p_centro_code: string; p_invoice_type: string }
        Returns: {
          broken_at: number
          is_valid: boolean
          total_checked: number
        }[]
      }
    }
    Enums: {
      accounting_entry_status: "draft" | "posted" | "closed"
      app_role: "admin" | "gestor" | "franquiciado" | "asesoria" | "contable"
      audit_action: "INSERT" | "UPDATE" | "DELETE"
      dq_severity: "critica" | "alta" | "media" | "baja"
      movement_type: "debit" | "credit"
      permission_action:
        | "employees.view"
        | "employees.create"
        | "employees.edit"
        | "employees.delete"
        | "employees.export"
        | "schedules.view"
        | "schedules.create"
        | "schedules.edit"
        | "schedules.delete"
        | "schedules.import"
        | "payrolls.view"
        | "payrolls.create"
        | "payrolls.edit"
        | "payrolls.delete"
        | "payrolls.import"
        | "payrolls.export"
        | "absences.view"
        | "absences.create"
        | "absences.edit"
        | "absences.delete"
        | "centres.view"
        | "centres.edit"
        | "centres.manage_users"
        | "centres.manage_companies"
        | "reports.view"
        | "reports.export"
        | "dq_issues.view"
        | "dq_issues.resolve"
        | "alerts.view"
        | "alerts.create"
        | "alerts.edit"
        | "alerts.delete"
        | "users.manage"
        | "roles.manage"
        | "franchisees.manage"
        | "settings.view"
        | "settings.edit"
        | "audit_logs.view"
        | "import.payrolls"
        | "import.schedules"
        | "import.employees"
        | "import.absences"
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
    Enums: {
      accounting_entry_status: ["draft", "posted", "closed"],
      app_role: ["admin", "gestor", "franquiciado", "asesoria", "contable"],
      audit_action: ["INSERT", "UPDATE", "DELETE"],
      dq_severity: ["critica", "alta", "media", "baja"],
      movement_type: ["debit", "credit"],
      permission_action: [
        "employees.view",
        "employees.create",
        "employees.edit",
        "employees.delete",
        "employees.export",
        "schedules.view",
        "schedules.create",
        "schedules.edit",
        "schedules.delete",
        "schedules.import",
        "payrolls.view",
        "payrolls.create",
        "payrolls.edit",
        "payrolls.delete",
        "payrolls.import",
        "payrolls.export",
        "absences.view",
        "absences.create",
        "absences.edit",
        "absences.delete",
        "centres.view",
        "centres.edit",
        "centres.manage_users",
        "centres.manage_companies",
        "reports.view",
        "reports.export",
        "dq_issues.view",
        "dq_issues.resolve",
        "alerts.view",
        "alerts.create",
        "alerts.edit",
        "alerts.delete",
        "users.manage",
        "roles.manage",
        "franchisees.manage",
        "settings.view",
        "settings.edit",
        "audit_logs.view",
        "import.payrolls",
        "import.schedules",
        "import.employees",
        "import.absences",
      ],
    },
  },
} as const
