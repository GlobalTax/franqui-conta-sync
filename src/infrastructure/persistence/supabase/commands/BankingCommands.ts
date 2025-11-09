// ============================================================================
// BANKING COMMANDS - Solo operaciones de escritura (CQRS)
// Separado de Queries para claridad y mantenibilidad
// ============================================================================

import { supabase } from "@/integrations/supabase/client";
import { TransactionMapper } from "../mappers/TransactionMapper";
import type { BankTransaction } from "@/domain/banking/types";
import type {
  CreateTransactionCommand,
  ImportTransactionsCommand,
  UpdateTransactionCommand,
  ReconcileTransactionCommand,
} from "@/domain/banking/repositories/IBankingRepository";

/**
 * Clase estática con comandos de escritura para operaciones bancarias
 */
export class BankingCommands {
  /**
   * Crea una transacción bancaria
   */
  static async createTransaction(
    command: CreateTransactionCommand
  ): Promise<BankTransaction> {
    const dbTransaction = TransactionMapper.toDatabase(command.transaction);

    const { data, error } = await supabase
      .from("bank_transactions")
      .insert(dbTransaction as any)
      .select()
      .single();

    if (error) {
      throw new Error(`Error creating bank transaction: ${error.message}`);
    }

    return TransactionMapper.toDomain(data);
  }

  /**
   * Importa múltiples transacciones bancarias (Norma 43)
   */
  static async importTransactions(
    command: ImportTransactionsCommand
  ): Promise<BankTransaction[]> {
    const dbTransactions = command.transactions.map(t => 
      TransactionMapper.toDatabase(t)
    );

    const { data, error } = await supabase
      .from("bank_transactions")
      .insert(dbTransactions as any)
      .select();

    if (error) {
      throw new Error(`Error importing bank transactions: ${error.message}`);
    }

    return (data || []).map(TransactionMapper.toDomain);
  }

  /**
   * Actualiza una transacción bancaria
   */
  static async updateTransaction(
    id: string,
    command: UpdateTransactionCommand
  ): Promise<BankTransaction> {
    const dbUpdates = TransactionMapper.toDatabase(command.updates as any);

    const { data, error } = await supabase
      .from("bank_transactions")
      .update(dbUpdates as any)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw new Error(`Error updating bank transaction: ${error.message}`);
    }

    return TransactionMapper.toDomain(data);
  }

  /**
   * Concilia una transacción bancaria con un asiento contable
   */
  static async reconcileTransaction(
    command: ReconcileTransactionCommand
  ): Promise<void> {
    const { error } = await supabase
      .from("bank_transactions")
      .update({
        status: 'reconciled',
        reconciled_entry_id: command.entryId,
        reconciled_at: new Date().toISOString(),
        reconciled_by: command.userId,
      })
      .eq("id", command.transactionId);

    if (error) {
      throw new Error(`Error reconciling transaction: ${error.message}`);
    }
  }
}
