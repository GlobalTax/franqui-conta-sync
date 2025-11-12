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
   * FASE 5: Prevenir duplicados usando upsert con onConflict
   */
  static async importTransactions(
    command: ImportTransactionsCommand
  ): Promise<BankTransaction[]> {
    const dbTransactions = command.transactions.map(t => 
      TransactionMapper.toDatabase(t)
    );

    // Usar upsert con onConflict para prevenir duplicados
    const { data, error } = await supabase
      .from("bank_transactions")
      .upsert(dbTransactions as any, {
        onConflict: 'bank_account_id,transaction_date,amount,reference,description',
        ignoreDuplicates: true, // ✅ Ignorar si ya existe
      })
      .select();

    // 23505 = unique_violation (esperado cuando hay duplicados)
    if (error && error.code !== '23505') {
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
   * FASE 3: Crear relación completa en bank_reconciliations
   */
  static async reconcileTransaction(
    command: ReconcileTransactionCommand
  ): Promise<void> {
    // PASO 1: Crear bank_reconciliation
    const { data: reconciliation, error: recError } = await supabase
      .from("bank_reconciliations")
      .insert({
        bank_transaction_id: command.transactionId,
        matched_type: 'entry',
        matched_id: command.entryId,
        reconciliation_status: 'confirmed',
        confidence_score: 100,
        reconciled_by: command.userId,
        reconciled_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (recError) {
      throw new Error(`Error creating reconciliation: ${recError.message}`);
    }

    // PASO 2: Actualizar bank_transaction
    const { error: txError } = await supabase
      .from("bank_transactions")
      .update({
        status: 'reconciled',
        reconciliation_id: reconciliation.id,
        matched_entry_id: command.entryId,
      })
      .eq("id", command.transactionId);

    if (txError) {
      throw new Error(`Error updating transaction: ${txError.message}`);
    }
  }
}
