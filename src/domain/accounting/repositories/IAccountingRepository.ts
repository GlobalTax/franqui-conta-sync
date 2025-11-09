// ============================================================================
// ACCOUNTING REPOSITORY INTERFACE
// Define el contrato de persistencia para operaciones contables
// ============================================================================

import type { JournalEntry, Transaction } from '../types';

export interface EntryFilters {
  centroCode?: string;
  companyId?: string;
  fiscalYearId?: string;
  status?: 'draft' | 'posted' | 'closed';
  startDate?: string;
  endDate?: string;
  searchTerm?: string;
}

export interface PaginationOptions {
  limit?: number;
  offset?: number;
  orderBy?: 'entry_date' | 'entry_number' | 'created_at';
  orderDirection?: 'asc' | 'desc';
}

export interface CreateEntryCommand {
  centroCode: string;
  entryDate: string;
  description: string;
  fiscalYearId: string;
  status: 'draft' | 'posted';
  totalDebit: number;
  totalCredit: number;
  transactions: Transaction[];
  createdBy: string;
  entryNumber: number;
}

export interface UpdateEntryCommand {
  entryDate?: string;
  description?: string;
  totalDebit?: number;
  totalCredit?: number;
  transactions?: Transaction[];
}

/**
 * Repository Interface para operaciones contables
 * Separa la lógica de dominio de la implementación de persistencia
 */
export interface IAccountingRepository {
  // ========== QUERIES (Read Operations) ==========
  
  /**
   * Encuentra un asiento por ID
   */
  findEntryById(id: string): Promise<JournalEntry | null>;
  
  /**
   * Busca asientos con filtros y paginación
   */
  findEntries(
    filters: EntryFilters,
    options?: PaginationOptions
  ): Promise<{ entries: JournalEntry[]; total: number }>;
  
  /**
   * Obtiene el siguiente número de asiento para un ejercicio fiscal
   */
  getNextEntryNumber(fiscalYearId: string): Promise<number>;
  
  // ========== COMMANDS (Write Operations) ==========
  
  /**
   * Crea un nuevo asiento contable con transacciones
   */
  createEntry(command: CreateEntryCommand): Promise<JournalEntry>;
  
  /**
   * Actualiza un asiento existente (solo si está en draft)
   */
  updateEntry(id: string, command: UpdateEntryCommand): Promise<JournalEntry>;
  
  /**
   * Elimina un asiento (solo si está en draft)
   */
  deleteEntry(id: string): Promise<void>;
  
  /**
   * Contabiliza un asiento (cambia estado de draft a posted)
   */
  postEntry(id: string, userId: string): Promise<void>;
}
