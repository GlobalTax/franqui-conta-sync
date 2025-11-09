// ============================================================================
// Entry Mapper - Conversión entre tipos DB y Domain
// Maneja el mapeo de asientos contables y sus transacciones
// ============================================================================

import type { JournalEntry, Transaction } from "@/domain/accounting/types";
import type { Database } from "@/integrations/supabase/types";

type EntryDB = Database['public']['Tables']['accounting_entries']['Row'];
type TransactionDB = Database['public']['Tables']['accounting_transactions']['Row'];
type EntryInsert = Database['public']['Tables']['accounting_entries']['Insert'];
type TransactionInsert = Database['public']['Tables']['accounting_transactions']['Insert'];

export class EntryMapper {
  /**
   * Convierte de formato DB a entidad de dominio
   */
  static toDomain(dbEntry: EntryDB & { accounting_transactions?: TransactionDB[] }): JournalEntry {
    return {
      id: dbEntry.id,
      entryNumber: dbEntry.entry_number,
      entryDate: dbEntry.entry_date,
      description: dbEntry.description,
      centroCode: dbEntry.centro_code,
      fiscalYearId: dbEntry.fiscal_year_id || undefined,
      status: dbEntry.status as 'draft' | 'posted' | 'closed',
      totalDebit: dbEntry.total_debit,
      totalCredit: dbEntry.total_credit,
      transactions: (dbEntry.accounting_transactions || [])
        .sort((a, b) => a.line_number - b.line_number)
        .map(this.transactionToDomain),
      createdBy: dbEntry.created_by || undefined,
      createdAt: dbEntry.created_at,
      updatedAt: dbEntry.updated_at,
    };
  }

  /**
   * Convierte transacción de DB a dominio
   */
  private static transactionToDomain(dbTrans: TransactionDB): Transaction {
    return {
      id: dbTrans.id,
      accountCode: dbTrans.account_code,
      movementType: dbTrans.movement_type as 'debit' | 'credit',
      amount: dbTrans.amount,
      description: dbTrans.description || '',
      lineNumber: dbTrans.line_number,
    };
  }

  /**
   * Convierte de entidad de dominio a formato DB (para INSERT/UPDATE)
   * @param entry - Entrada parcial o completa
   * @param entryNumber - Número de asiento (requerido para nuevos asientos)
   */
  static toDatabase(
    entry: Partial<JournalEntry>,
    entryNumber?: number
  ): {
    entry: Partial<EntryInsert>;
    transactions: Array<{
      account_code: string;
      movement_type: 'debit' | 'credit';
      amount: number;
      description: string | null;
      line_number: number;
    }>;
  } {
    const dbEntry: Partial<EntryInsert> = {};

    if (entryNumber !== undefined) dbEntry.entry_number = entryNumber;
    if (entry.entryDate !== undefined) dbEntry.entry_date = entry.entryDate;
    if (entry.description !== undefined) dbEntry.description = entry.description;
    if (entry.centroCode !== undefined) dbEntry.centro_code = entry.centroCode;
    if (entry.fiscalYearId !== undefined) dbEntry.fiscal_year_id = entry.fiscalYearId;
    if (entry.status !== undefined) dbEntry.status = entry.status;
    if (entry.totalDebit !== undefined) dbEntry.total_debit = entry.totalDebit;
    if (entry.totalCredit !== undefined) dbEntry.total_credit = entry.totalCredit;
    if (entry.createdBy !== undefined) dbEntry.created_by = entry.createdBy;

    const dbTransactions = (entry.transactions || []).map(t => ({
      account_code: t.accountCode,
      movement_type: t.movementType as 'debit' | 'credit',
      amount: t.amount,
      description: t.description || null,
      line_number: t.lineNumber || 0,
    }));

    return {
      entry: dbEntry,
      transactions: dbTransactions,
    };
  }

  /**
   * Convierte lista de DB a lista de dominio
   */
  static toDomainList(dbEntries: (EntryDB & { accounting_transactions?: TransactionDB[] })[]): JournalEntry[] {
    return dbEntries.map(this.toDomain);
  }
}
