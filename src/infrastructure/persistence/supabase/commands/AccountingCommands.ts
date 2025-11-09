// ============================================================================
// ACCOUNTING COMMANDS - Solo operaciones de escritura (CQRS)
// Separado de Queries para claridad y mantenibilidad
// ============================================================================

import { supabase } from "@/integrations/supabase/client";
import { EntryMapper } from "../mappers/EntryMapper";
import { AccountingQueries } from "../queries/AccountingQueries";
import type { JournalEntry } from "@/domain/accounting/types";
import type { CreateEntryCommand, UpdateEntryCommand } from "@/domain/accounting/repositories/IAccountingRepository";

/**
 * Clase estática con comandos de escritura para operaciones contables
 */
export class AccountingCommands {
  /**
   * Crea un nuevo asiento contable con sus transacciones
   */
  static async createEntry(command: CreateEntryCommand): Promise<JournalEntry> {
    const dbData = EntryMapper.toDatabase(
      {
        centroCode: command.centroCode,
        entryDate: command.entryDate,
        description: command.description,
        fiscalYearId: command.fiscalYearId,
        status: command.status,
        totalDebit: command.totalDebit,
        totalCredit: command.totalCredit,
        transactions: command.transactions,
        createdBy: command.createdBy,
      } as any,
      command.entryNumber
    );

    // Insertar entry
    const { data: newEntry, error: entryError } = await supabase
      .from("accounting_entries")
      .insert([dbData.entry as any])
      .select()
      .single();

    if (entryError) {
      throw new Error(`Error creating journal entry: ${entryError.message}`);
    }

    // Insertar transacciones asociadas
    const transactions = dbData.transactions.map((t, index) => ({
      ...t,
      entry_id: newEntry.id,
      line_number: index + 1,
    }));

    const { error: transError } = await supabase
      .from("accounting_transactions")
      .insert(transactions as any);

    if (transError) {
      // Rollback: eliminar entry si falla transacciones
      await supabase.from("accounting_entries").delete().eq("id", newEntry.id);
      throw new Error(`Error creating transactions: ${transError.message}`);
    }

    // Recuperar entry completo con transacciones
    const result = await AccountingQueries.findEntryById(newEntry.id);
    if (!result) {
      throw new Error("Failed to retrieve created entry");
    }
    
    return result;
  }

  /**
   * Actualiza un asiento (solo si está en draft)
   */
  static async updateEntry(
    id: string,
    command: UpdateEntryCommand
  ): Promise<JournalEntry> {
    // Verificar que esté en draft
    const existing = await AccountingQueries.findEntryById(id);
    if (!existing) {
      throw new Error("Journal entry not found");
    }
    if (existing.status !== 'draft') {
      throw new Error("Cannot update posted or closed entries");
    }

    const dbUpdates = EntryMapper.toDatabase(command as any, existing.entryNumber);

    const { error } = await supabase
      .from("accounting_entries")
      .update(dbUpdates.entry as any)
      .eq("id", id);

    if (error) {
      throw new Error(`Error updating journal entry: ${error.message}`);
    }

    const result = await AccountingQueries.findEntryById(id);
    if (!result) {
      throw new Error("Failed to retrieve updated entry");
    }
    
    return result;
  }

  /**
   * Elimina un asiento (solo si está en draft)
   */
  static async deleteEntry(id: string): Promise<void> {
    const existing = await AccountingQueries.findEntryById(id);
    if (!existing) {
      throw new Error("Journal entry not found");
    }
    if (existing.status !== 'draft') {
      throw new Error("Cannot delete posted or closed entries");
    }

    // Eliminar transacciones primero
    const { error: transError } = await supabase
      .from("accounting_transactions")
      .delete()
      .eq("entry_id", id);

    if (transError) {
      throw new Error(`Error deleting transactions: ${transError.message}`);
    }

    // Eliminar entry
    const { error: entryError } = await supabase
      .from("accounting_entries")
      .delete()
      .eq("id", id);

    if (entryError) {
      throw new Error(`Error deleting journal entry: ${entryError.message}`);
    }
  }

  /**
   * Contabiliza un asiento (cambia estado de draft a posted)
   */
  static async postEntry(id: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from("accounting_entries")
      .update({
        status: 'posted',
        posted_at: new Date().toISOString(),
        posted_by: userId,
      })
      .eq("id", id);

    if (error) {
      throw new Error(`Error posting entry: ${error.message}`);
    }
  }
}
