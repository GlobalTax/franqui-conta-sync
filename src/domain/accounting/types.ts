// ============================================================================
// TIPOS DE DOMINIO CONTABLE
// Tipos base para el dominio contable independientes de la infraestructura
// ============================================================================

export type MovementType = 'debit' | 'credit';
export type AccountingEntryStatus = 'draft' | 'posted' | 'closed';

// Entidad de transacción contable (línea de asiento)
export interface Transaction {
  id?: string;
  accountCode: string;
  movementType: MovementType;
  amount: number;
  description: string;
  lineNumber?: number;
}

// Entidad de asiento contable
export interface JournalEntry {
  id?: string;
  entryNumber?: number;
  entryDate: string;
  description: string;
  centroCode: string;
  fiscalYearId?: string;
  status?: AccountingEntryStatus;
  totalDebit: number;
  totalCredit: number;
  transactions: Transaction[];
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Resultado de validación
export interface ValidationResult {
  valid: boolean;
  error?: string;
  details?: string;
}

// Totales calculados
export interface EntryTotals {
  debit: number;
  credit: number;
  difference: number;
  isBalanced: boolean;
}
