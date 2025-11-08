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
      accounting_transactions: {
        Row: {
          account_code: string
          amount: number
          created_at: string
          description: string | null
          document_ref: string | null
          entry_id: string
          id: string
          line_number: number
          movement_type: Database["public"]["Enums"]["movement_type"]
        }
        Insert: {
          account_code: string
          amount: number
          created_at?: string
          description?: string | null
          document_ref?: string | null
          entry_id: string
          id?: string
          line_number: number
          movement_type: Database["public"]["Enums"]["movement_type"]
        }
        Update: {
          account_code?: string
          amount?: number
          created_at?: string
          description?: string | null
          document_ref?: string | null
          entry_id?: string
          id?: string
          line_number?: number
          movement_type?: Database["public"]["Enums"]["movement_type"]
        }
        Relationships: [
          {
            foreignKeyName: "accounting_transactions_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "accounting_entries"
            referencedColumns: ["id"]
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
      companies: {
        Row: {
          activo: boolean | null
          cif: string
          created_at: string | null
          franchisee_id: string
          id: string
          razon_social: string
          tipo_sociedad: string | null
          updated_at: string | null
        }
        Insert: {
          activo?: boolean | null
          cif: string
          created_at?: string | null
          franchisee_id: string
          id?: string
          razon_social: string
          tipo_sociedad?: string | null
          updated_at?: string | null
        }
        Update: {
          activo?: boolean | null
          cif?: string
          created_at?: string | null
          franchisee_id?: string
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
      fiscal_years: {
        Row: {
          centro_code: string | null
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
        ]
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
          subtotal: number
          tax_amount: number
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
          subtotal: number
          tax_amount: number
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
          subtotal?: number
          tax_amount?: number
          tax_rate?: number | null
          total?: number
          unit_price?: number
        }
        Relationships: []
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
          centro_code: string
          created_at: string | null
          created_by: string | null
          document_path: string | null
          due_date: string | null
          entry_id: string | null
          id: string
          invoice_date: string
          invoice_number: string
          notes: string | null
          ocr_confidence: number | null
          payment_transaction_id: string | null
          status: string | null
          subtotal: number | null
          supplier_id: string | null
          tax_total: number | null
          total: number
          updated_at: string | null
        }
        Insert: {
          centro_code: string
          created_at?: string | null
          created_by?: string | null
          document_path?: string | null
          due_date?: string | null
          entry_id?: string | null
          id?: string
          invoice_date: string
          invoice_number: string
          notes?: string | null
          ocr_confidence?: number | null
          payment_transaction_id?: string | null
          status?: string | null
          subtotal?: number | null
          supplier_id?: string | null
          tax_total?: number | null
          total: number
          updated_at?: string | null
        }
        Update: {
          centro_code?: string
          created_at?: string | null
          created_by?: string | null
          document_path?: string | null
          due_date?: string | null
          entry_id?: string | null
          id?: string
          invoice_date?: string
          invoice_number?: string
          notes?: string | null
          ocr_confidence?: number | null
          payment_transaction_id?: string | null
          status?: string | null
          subtotal?: number | null
          supplier_id?: string | null
          tax_total?: number | null
          total?: number
          updated_at?: string | null
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
    }
    Views: {
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
      calculate_balance_sheet: {
        Args: { p_centro_code: string; p_fecha_corte: string }
        Returns: {
          balance: number
          grupo: string
          nombre_grupo: string
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
      get_centros: {
        Args: never
        Returns: {
          centro: string
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
      get_hours_metrics: {
        Args: { p_centro?: string; p_end_date: string; p_start_date: string }
        Returns: {
          horas_ausencia: number
          horas_planificadas: number
          horas_trabajadas: number
          tasa_absentismo: number
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
      get_planned_vs_actual_costs: {
        Args: { p_centro?: string; p_end_date: string; p_start_date: string }
        Returns: {
          centro: string
          costes_planificados: number
          costes_reales: number
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
      refresh_user_memberships: { Args: never; Returns: undefined }
      set_primary_company: {
        Args: { _centre_id: string; _company_id: string }
        Returns: undefined
      }
      user_can_access_centro: {
        Args: { _centro_code: string; _user_id: string }
        Returns: boolean
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
