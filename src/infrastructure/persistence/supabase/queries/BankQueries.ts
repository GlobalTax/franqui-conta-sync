// ============================================================================
// BANK QUERIES
// Capa de persistencia para transacciones bancarias y cuentas
// ============================================================================

import { supabase } from "@/integrations/supabase/client";
import { TransactionMapper } from "../mappers/TransactionMapper";
import type { 
  BankTransaction, 
  BankAccount,
  BankTransactionFilters 
} from "@/domain/banking/types";

/**
 * Obtiene transacciones bancarias con filtros
 */
export async function getBankTransactions(
  filters: BankTransactionFilters
): Promise<BankTransaction[]> {
  let query = supabase
    .from("bank_transactions")
    .select(`
      *,
      bank_accounts!inner(
        id,
        account_name,
        iban,
        centro_code
      )
    `)
    .order("transaction_date", { ascending: false });

  if (filters.accountId) {
    query = query.eq("bank_account_id", filters.accountId);
  }

  if (filters.centroCode) {
    query = query.eq("bank_accounts.centro_code", filters.centroCode);
  }

  if (filters.startDate) {
    query = query.gte("transaction_date", filters.startDate);
  }

  if (filters.endDate) {
    query = query.lte("transaction_date", filters.endDate);
  }

  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  if (filters.searchTerm) {
    query = query.ilike("description", `%${filters.searchTerm}%`);
  }

  const { data, error } = await query;
  
  if (error) {
    throw new Error(`Error fetching bank transactions: ${error.message}`);
  }

  return (data || []).map(TransactionMapper.toDomain);
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
