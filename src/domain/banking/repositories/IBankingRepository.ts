// ============================================================================
// BANKING REPOSITORY INTERFACE
// Define el contrato de persistencia para operaciones bancarias
// ============================================================================

import type { BankTransaction, BankAccount, BankTransactionFilters } from '../types';
import type { PaginatedBankTransactions } from '@/infrastructure/persistence/supabase/queries/BankingQueries';

export interface CreateTransactionCommand {
  transaction: Omit<BankTransaction, 'id' | 'createdAt'>;
}

export interface ImportTransactionsCommand {
  transactions: Omit<BankTransaction, 'id' | 'createdAt'>[];
}

export interface UpdateTransactionCommand {
  updates: Partial<BankTransaction>;
}

export interface ReconcileTransactionCommand {
  transactionId: string;
  entryId: string;
  userId: string;
}

/**
 * Repository Interface para operaciones bancarias
 * Separa la lógica de dominio de la implementación de persistencia
 * FASE 7: findTransactions ahora devuelve PaginatedBankTransactions
 */
export interface IBankingRepository {
  // ========== QUERIES (Read Operations) ==========
  
  /**
   * Encuentra una transacción por ID
   */
  findTransactionById(id: string): Promise<BankTransaction | null>;
  
  /**
   * Busca transacciones bancarias con filtros y paginación
   */
  findTransactions(filters: BankTransactionFilters): Promise<PaginatedBankTransactions>;
  
  /**
   * Obtiene cuentas bancarias por centro
   */
  getBankAccounts(centroCode?: string): Promise<BankAccount[]>;
  
  // ========== COMMANDS (Write Operations) ==========
  
  /**
   * Crea una transacción bancaria
   */
  createTransaction(command: CreateTransactionCommand): Promise<BankTransaction>;
  
  /**
   * Importa múltiples transacciones (Norma 43)
   */
  importTransactions(command: ImportTransactionsCommand): Promise<BankTransaction[]>;
  
  /**
   * Actualiza una transacción bancaria
   */
  updateTransaction(id: string, command: UpdateTransactionCommand): Promise<BankTransaction>;
  
  /**
   * Concilia una transacción bancaria con un asiento contable
   */
  reconcileTransaction(command: ReconcileTransactionCommand): Promise<void>;
}
