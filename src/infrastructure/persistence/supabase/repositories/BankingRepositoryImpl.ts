// ============================================================================
// BANKING REPOSITORY IMPLEMENTATION (Supabase)
// Implementación concreta del patrón Repository para Banking
// ============================================================================

import { IBankingRepository } from '@/domain/banking/repositories/IBankingRepository';
import { BankingQueries } from '../queries/BankingQueries';
import { BankingCommands } from '../commands/BankingCommands';
import type { BankTransaction, BankAccount, BankTransactionFilters } from '@/domain/banking/types';
import type {
  CreateTransactionCommand,
  ImportTransactionsCommand,
  UpdateTransactionCommand,
  ReconcileTransactionCommand,
} from '@/domain/banking/repositories/IBankingRepository';

/**
 * Implementación concreta de IBankingRepository usando Supabase
 * Delega a BankingQueries (read) y BankingCommands (write)
 */
export class BankingRepositoryImpl implements IBankingRepository {
  // ========== QUERIES (Read Operations) ==========

  async findTransactionById(id: string): Promise<BankTransaction | null> {
    return BankingQueries.findTransactionById(id);
  }

  async findTransactions(filters: BankTransactionFilters): Promise<BankTransaction[]> {
    return BankingQueries.findTransactions(filters);
  }

  async getBankAccounts(centroCode?: string): Promise<BankAccount[]> {
    return BankingQueries.getBankAccounts(centroCode);
  }

  // ========== COMMANDS (Write Operations) ==========

  async createTransaction(command: CreateTransactionCommand): Promise<BankTransaction> {
    return BankingCommands.createTransaction(command);
  }

  async importTransactions(command: ImportTransactionsCommand): Promise<BankTransaction[]> {
    return BankingCommands.importTransactions(command);
  }

  async updateTransaction(id: string, command: UpdateTransactionCommand): Promise<BankTransaction> {
    return BankingCommands.updateTransaction(id, command);
  }

  async reconcileTransaction(command: ReconcileTransactionCommand): Promise<void> {
    return BankingCommands.reconcileTransaction(command);
  }
}
