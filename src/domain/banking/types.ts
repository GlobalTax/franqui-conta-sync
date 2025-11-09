// ============================================================================
// TIPOS DE DOMINIO - BANCA
// Tipos para transacciones bancarias y conciliación independientes de infraestructura
// ============================================================================

/**
 * Transacción bancaria
 */
export interface BankTransaction {
  id: string;
  bankAccountId: string;
  transactionDate: string;
  valueDate: string | null;
  description: string;
  reference: string | null;
  amount: number;
  balance: number | null;
  status: TransactionStatus;
  matchedEntryId: string | null;
  matchedInvoiceId: string | null;
  reconciliationId: string | null;
  importBatchId: string | null;
  createdAt: string;
}

/**
 * Cuenta bancaria
 */
export interface BankAccount {
  id: string;
  centroCode: string;
  accountName: string;
  iban: string;
  swift: string | null;
  currency: string;
  currentBalance: number;
  accountCode: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Conciliación bancaria
 */
export interface BankReconciliation {
  id: string;
  bankTransactionId: string;
  matchedType: MatchedType | null;
  matchedId: string | null;
  reconciliationStatus: ReconciliationStatus;
  confidenceScore: number | null;
  ruleId: string | null;
  reconciledBy: string | null;
  reconciledAt: string | null;
  notes: string | null;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

/**
 * Regla de conciliación automática
 */
export interface ReconciliationRule {
  id: string;
  centroCode: string;
  ruleName: string;
  bankAccountId: string;
  transactionType: 'debit' | 'credit' | null;
  descriptionPattern: string | null;
  amountMin: number | null;
  amountMax: number | null;
  autoMatchType: AutoMatchType;
  suggestedAccount: string | null;
  confidenceThreshold: number;
  active: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Estados de transacción bancaria
 */
export type TransactionStatus = 'pending' | 'reconciled' | 'ignored';

/**
 * Estados de conciliación
 */
export type ReconciliationStatus = 'pending' | 'suggested' | 'matched' | 'reviewed' | 'confirmed' | 'rejected';

/**
 * Tipos de match
 */
export type MatchedType = 'daily_closure' | 'invoice_received' | 'invoice_issued' | 'entry' | 'manual';

/**
 * Tipos de auto-match
 */
export type AutoMatchType = 'daily_closure' | 'invoice' | 'royalty' | 'commission' | 'manual';

/**
 * Filtros para transacciones bancarias
 */
export interface BankTransactionFilters {
  accountId?: string;
  centroCode?: string;
  startDate?: string;
  endDate?: string;
  status?: TransactionStatus;
  minAmount?: number;
  maxAmount?: number;
  searchTerm?: string;
}
