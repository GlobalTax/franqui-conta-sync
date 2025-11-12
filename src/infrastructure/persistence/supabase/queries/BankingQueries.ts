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
 * Respuesta con paginación
 */
export interface PaginatedBankTransactions {
  transactions: BankTransaction[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/**
 * Filtros extendidos con paginación
 */
export interface BankTransactionFiltersWithPagination extends BankTransactionFilters {
  page?: number;
  pageSize?: number;
}

/**
 * Clase estática con queries de solo lectura para operaciones bancarias
 */
export class BankingQueries {
  /**
   * Obtiene transacciones bancarias con filtros y paginación
   * FASE 7: Añadir paginación para performance
   */
  static async findTransactions(
    filters: BankTransactionFiltersWithPagination
  ): Promise<PaginatedBankTransactions> {
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 50;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
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
      `, { count: 'exact' })
      .range(from, to)
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

    const { data, error, count } = await query;
    
    if (error) {
      throw new Error(`Error fetching bank transactions: ${error.message}`);
    }

    const total = count || 0;
    const transactions = (data || []).map(TransactionMapper.toDomain);

    return {
      transactions,
      total,
      page,
      pageSize,
      hasMore: to < total - 1,
    };
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
