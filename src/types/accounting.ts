// Accounting System Types
// These types match the database schema for the new accounting tables

// Enums
export type AccountingRole = 'admin' | 'contable' | 'gerente_restaurante';
export type InvoiceStatus = 'pending' | 'review' | 'approved' | 'posted' | 'rejected';
export type BankTransactionStatus = 'pending' | 'reconciled' | 'ignored';
export type JournalEntryStatus = 'draft' | 'posted' | 'reversed';
export type AccountType = 'A' | 'P' | 'PN' | 'ING' | 'GAS';
export type StatementType = 'balance' | 'pnl' | 'cashflow';
export type SystemModule = 'hr' | 'accounting';

// Organizations (franchisees)
export interface Organization {
  id: string;
  name: string;
  email: string;
  company_tax_id: string | null;
  cif: string | null;
  orquest_business_id: string | null;
  orquest_api_key: string | null;
  created_at: string;
  updated_at: string;
}

// Restaurants (centres)
export interface Restaurant {
  id: string;
  codigo: string;
  nombre: string;
  franchisee_id: string;
  site_number: string | null;
  direccion: string | null;
  ciudad: string | null;
  pais: string | null;
  state: string | null;
  postal_code: string | null;
  cost_center_code: string | null;
  seating_capacity: number | null;
  square_meters: number | null;
  opening_date: string | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

// Memberships
export interface Membership {
  id: string;
  user_id: string;
  organization_id: string;
  role: AccountingRole;
  restaurant_id: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  organization?: Organization | null;
  restaurant?: Restaurant | null;
}

// Accounts (Plan de Cuentas)
export interface Account {
  id: string;
  centro_code: string;
  company_id: string | null;
  code: string;
  name: string;
  account_type: AccountType;
  parent_code: string | null;
  level: number;
  is_detail: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
}

// Periods
export interface Period {
  id: string;
  organization_id: string;
  year: number;
  month: number;
  start_date: string;
  end_date: string;
  is_closed: boolean;
  closed_at: string | null;
  closed_by: string | null;
  created_at: string;
  updated_at: string;
}

// Cost Centers
export interface CostCenter {
  id: string;
  organization_id: string;
  code: string;
  name: string;
  restaurant_id: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

// Suppliers
export interface Supplier {
  id: string;
  organization_id: string;
  tax_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  default_account_id: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

// Invoices
export interface Invoice {
  id: string;
  organization_id: string;
  supplier_id: string | null;
  restaurant_id: string;
  cost_center_id: string;
  invoice_number: string;
  issue_date: string;
  due_date: string | null;
  currency: string;
  subtotal: number | null;
  tax_total: number | null;
  total: number;
  status: InvoiceStatus;
  ocr_provider: string | null;
  ocr_confidence: number | null;
  source: 'upload' | 'email' | 'api';
  attachment_url: string | null;
  dedupe_hash: string | null;
  journal_entry_id: string | null;
  created_at: string;
  updated_at: string;
}

// Invoice Lines
export interface InvoiceLine {
  id: string;
  invoice_id: string;
  line_number: number;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  account_id: string | null;
  created_at: string;
}

// OCR Results
export interface OCRResult {
  id: string;
  invoice_id: string;
  provider: string;
  raw_response: any;
  confidence_score: number | null;
  extracted_data: any;
  created_at: string;
}

// Journal Entries
export interface JournalEntry {
  id: string;
  organization_id: string;
  period_id: string;
  restaurant_id: string | null;
  entry_number: string;
  entry_date: string;
  description: string;
  status: JournalEntryStatus;
  source_type: string | null;
  source_id: string | null;
  posted_at: string | null;
  posted_by: string | null;
  reversed_at: string | null;
  reversed_by: string | null;
  reversal_entry_id: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

// Journal Lines
export interface JournalLine {
  id: string;
  journal_entry_id: string;
  account_id: string;
  line_number: number;
  description: string | null;
  debit: number;
  credit: number;
  cost_center_id: string | null;
  restaurant_id: string | null;
  created_at: string;
}

// Bank Providers
export interface BankProvider {
  id: string;
  name: string;
  code: string;
  api_endpoint: string | null;
  logo_url: string | null;
  supports_auto_sync: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
}

// Bank Accounts
export interface BankAccount {
  id: string;
  organization_id: string;
  provider_id: string | null;
  account_name: string;
  account_number: string;
  iban: string | null;
  currency: string;
  gl_account_id: string;
  auto_sync_enabled: boolean;
  last_sync_at: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

// Bank Transactions
export interface BankTransaction {
  id: string;
  bank_account_id: string;
  organization_id: string;
  transaction_date: string;
  value_date: string | null;
  description: string;
  reference: string | null;
  amount: number;
  balance: number | null;
  status: BankTransactionStatus;
  matched_invoice_id: string | null;
  journal_entry_id: string | null;
  reconciliation_id: string | null;
  dedupe_hash: string;
  raw_data: any | null;
  created_at: string;
  updated_at: string;
}

// Reconciliations
export interface Reconciliation {
  id: string;
  bank_account_id: string;
  organization_id: string;
  period_id: string;
  reconciliation_date: string;
  statement_balance: number;
  book_balance: number;
  difference: number;
  is_reconciled: boolean;
  reconciled_at: string | null;
  reconciled_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Statement Templates
export interface StatementTemplate {
  id: string;
  organization_id: string;
  name: string;
  statement_type: StatementType;
  version: number;
  active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

// Statement Lines
export interface StatementLine {
  id: string;
  template_id: string;
  line_number: number;
  code: string;
  label: string;
  parent_line_id: string | null;
  level: number;
  is_bold: boolean;
  is_total: boolean;
  created_at: string;
}

// Statement Formulas
export interface StatementFormula {
  id: string;
  line_id: string;
  operation: 'sum' | 'subtract' | 'multiply' | 'divide' | 'formula';
  source_lines: string[] | null;
  custom_formula: string | null;
  created_at: string;
}

// Account Mappings
export interface AccountMapping {
  id: string;
  organization_id: string;
  statement_line_id: string;
  account_id: string;
  created_at: string;
}

// Parameters
export interface Parameter {
  id: string;
  organization_id: string;
  key: string;
  value: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

// Invites (updated)
export interface Invite {
  id: string;
  email: string;
  token: string;
  system_module: SystemModule;
  accounting_role: AccountingRole | null;
  organization_id: string | null;
  restaurant_id: string | null;
  invited_by: string | null;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}
