// ============================================================================
// BANK QUERIES
// Capa de persistencia para transacciones bancarias y cuentas
// FASE 7: Delegado a BankingQueries para consistencia
// ============================================================================

import { supabase } from "@/integrations/supabase/client";
import { TransactionMapper } from "../mappers/TransactionMapper";
import { BankingQueries, type PaginatedBankTransactions } from "./BankingQueries";
import type { 
  BankTransaction, 
  BankAccount,
  BankTransactionFilters 
} from "@/domain/banking/types";

/**
 * Obtiene transacciones bancarias con filtros y paginación
 */
export async function getBankTransactions(
  filters: BankTransactionFilters
): Promise<PaginatedBankTransactions> {
  return BankingQueries.findTransactions(filters);
}

/**
 * Crea una transacción bancaria
 */
export async function createBankTransaction(
  transaction: Omit<BankTransaction, 'id' | 'createdAt'>
): Promise<BankTransaction> {
  const dbTransaction = TransactionMapper.toDatabase(transaction);

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
 * Actualiza una transacción bancaria
 */
export async function updateBankTransaction(
  id: string,
  updates: Partial<BankTransaction>
): Promise<BankTransaction> {
  const dbUpdates = TransactionMapper.toDatabase(updates);

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
 * Importa múltiples transacciones bancarias (Norma 43)
 */
export async function importBankTransactions(
  transactions: Omit<BankTransaction, 'id' | 'createdAt'>[]
): Promise<BankTransaction[]> {
  const dbTransactions = transactions.map(t => TransactionMapper.toDatabase(t));

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
 * Obtiene cuentas bancarias por centro
 */
export async function getBankAccounts(
  centroCode?: string
): Promise<BankAccount[]> {
  let query = supabase
    .from("bank_accounts")
    .select("*")
    .eq("active", true)
    .order("account_name");

  if (centroCode) {
    query = query.eq("centro_code", centroCode);
  }

  const { data, error } = await query;
  
  if (error) {
    throw new Error(`Error fetching bank accounts: ${error.message}`);
  }

  return (data || []).map(TransactionMapper.bankAccountToDomain);
}
