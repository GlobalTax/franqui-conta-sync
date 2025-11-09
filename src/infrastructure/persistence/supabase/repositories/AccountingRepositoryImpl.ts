// ============================================================================
// ACCOUNTING REPOSITORY IMPLEMENTATION (Supabase)
// Implementación concreta del patrón Repository para Accounting
// ============================================================================

import { IAccountingRepository } from '@/domain/accounting/repositories/IAccountingRepository';
import { AccountingQueries } from '../queries/AccountingQueries';
import { AccountingCommands } from '../commands/AccountingCommands';
import type { JournalEntry } from '@/domain/accounting/types';
import type {
  EntryFilters,
  PaginationOptions,
  CreateEntryCommand,
  UpdateEntryCommand,
} from '@/domain/accounting/repositories/IAccountingRepository';

/**
 * Implementación concreta de IAccountingRepository usando Supabase
 * Delega a AccountingQueries (read) y AccountingCommands (write)
 */
export class AccountingRepositoryImpl implements IAccountingRepository {
  // ========== QUERIES (Read Operations) ==========

  async findEntryById(id: string): Promise<JournalEntry | null> {
    return AccountingQueries.findEntryById(id);
  }

  async findEntries(
    filters: EntryFilters,
    options?: PaginationOptions
  ): Promise<{ entries: JournalEntry[]; total: number }> {
    return AccountingQueries.findEntries(filters, options);
  }

  async getNextEntryNumber(fiscalYearId: string): Promise<number> {
    return AccountingQueries.getNextEntryNumber(fiscalYearId);
  }

  // ========== COMMANDS (Write Operations) ==========

  async createEntry(command: CreateEntryCommand): Promise<JournalEntry> {
    return AccountingCommands.createEntry(command);
  }

  async updateEntry(id: string, command: UpdateEntryCommand): Promise<JournalEntry> {
    return AccountingCommands.updateEntry(id, command);
  }

  async deleteEntry(id: string): Promise<void> {
    return AccountingCommands.deleteEntry(id);
  }

  async postEntry(id: string, userId: string): Promise<void> {
    return AccountingCommands.postEntry(id, userId);
  }
}
