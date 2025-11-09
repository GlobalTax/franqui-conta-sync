// ============================================================================
// BANKING QUERIES - Solo operaciones de lectura (CQRS)
// Separado de Commands para claridad y mantenibilidad
// ============================================================================

import { supabase } from "@/integrations/supabase/client";
import { TransactionMapper } from "../mappers/TransactionMapper";
import type { 
  BankTransaction, 
  BankAccount,
  BankTransactionFilters 
} from "@/domain/banking/types";

/**
 * Clase estática con queries de solo lectura para operaciones bancarias
 */
export class BankingQueries {
  /**
   * Obtiene transacciones bancarias con filtros
   */
  static async findTransactions(
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
   * Encuentra una transacción por ID
   */
  static async findTransactionById(id: string): Promise<BankTransaction | null> {
    const { data, error } = await supabase
      .from("bank_transactions")
      .select(`
        *,
        bank_accounts(
          id,
          account_name,
          iban,
          centro_code
        )
      `)
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new Error(`Error fetching bank transaction: ${error.message}`);
    }

    return data ? TransactionMapper.toDomain(data) : null;
  }

  /**
   * Obtiene cuentas bancarias por centro
   */
  static async getBankAccounts(
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
}
