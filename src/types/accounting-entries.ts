export type AccountingEntryStatus = 'draft' | 'posted' | 'closed';
export type MovementType = 'debit' | 'credit';

export interface FiscalYear {
  id: string;
  year: number;
  start_date: string;
  end_date: string;
  status: 'open' | 'closed';
  centro_code: string | null;
  created_at: string;
  updated_at: string;
}

export interface AccountingEntry {
  id: string;
  entry_number: number;
  entry_date: string;
  description: string;
  centro_code: string;
  fiscal_year_id: string | null;
  status: AccountingEntryStatus;
  total_debit: number;
  total_credit: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AccountingTransaction {
  id: string;
  entry_id: string;
  account_code: string;
  movement_type: MovementType;
  amount: number;
  description: string | null;
  document_ref: string | null;
  line_number: number;
  created_at: string;
}

export interface AccountingEntryWithTransactions extends AccountingEntry {
  accounting_transactions: AccountingTransaction[];
}

export interface NewAccountingEntryFormData {
  entry_date: string;
  description: string;
  transactions: {
    account_code: string;
    movement_type: MovementType;
    amount: number;
    description: string;
  }[];
}
