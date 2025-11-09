// ============================================================================
// Account Queries - Gestión de Cuentas Contables (PGC)
// Centraliza todas las operaciones de persistencia de cuentas
// ============================================================================

import { supabase } from "@/integrations/supabase/client";
import { AccountMapper } from "../mappers/AccountMapper";
import type { Account } from "@/domain/accounting/types";

export interface AccountFilters {
  centroCode: string;
  companyId?: string | null;
  active?: boolean;
  accountType?: string;
  groupCode?: string; // Para filtrar por grupo PGC (ej: "6" para gastos)
}

/**
 * Obtiene cuentas contables con filtros
 * @param filters - Filtros de búsqueda
 * @returns Lista de cuentas mapeadas a entidades de dominio
 */
export async function getAccounts(filters: AccountFilters): Promise<Account[]> {
  let query = supabase
    .from("accounts")
    .select("*")
    .eq("centro_code", filters.centroCode)
    .order("code", { ascending: true });

  if (filters.companyId !== undefined) {
    if (filters.companyId === null) {
      query = query.is("company_id", null);
    } else {
      query = query.eq("company_id", filters.companyId);
    }
  }

  if (filters.active !== undefined) {
    query = query.eq("active", filters.active);
  }

  if (filters.accountType) {
    query = query.eq("account_type", filters.accountType);
  }

  if (filters.groupCode) {
    query = query.like("code", `${filters.groupCode}%`);
  }

  const { data, error } = await query;
  
  if (error) {
    throw new Error(`Error fetching accounts: ${error.message}`);
  }

  return (data || []).map(AccountMapper.toDomain);
}

/**
 * Obtiene una cuenta por su código
 */
export async function getAccountByCode(
  centroCode: string,
  accountCode: string
): Promise<Account | null> {
  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .eq("centro_code", centroCode)
    .eq("code", accountCode)
    .maybeSingle();

  if (error) {
    throw new Error(`Error fetching account: ${error.message}`);
  }

  return data ? AccountMapper.toDomain(data) : null;
}

/**
 * Obtiene una cuenta por su ID
 */
export async function getAccountById(id: string): Promise<Account | null> {
  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`Error fetching account: ${error.message}`);
  }

  return data ? AccountMapper.toDomain(data) : null;
}

/**
 * Crea una nueva cuenta contable
 */
export async function createAccount(
  account: Omit<Account, "id" | "createdAt" | "updatedAt">
): Promise<Account> {
  const dbAccount = AccountMapper.toDatabase(account);
  
  const { data, error } = await supabase
    .from("accounts")
    .insert([dbAccount as any])
    .select()
    .single();

  if (error) {
    throw new Error(`Error creating account: ${error.message}`);
  }

  return AccountMapper.toDomain(data);
}

/**
 * Actualiza una cuenta existente
 */
export async function updateAccount(
  id: string,
  updates: Partial<Account>
): Promise<Account> {
  const dbUpdates = AccountMapper.toDatabase(updates);

  const { data, error } = await supabase
    .from("accounts")
    .update(dbUpdates as any)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(`Error updating account: ${error.message}`);
  }

  return AccountMapper.toDomain(data);
}

/**
 * Desactiva una cuenta (soft delete)
 */
export async function deactivateAccount(id: string): Promise<void> {
  const { error } = await supabase
    .from("accounts")
    .update({ active: false })
    .eq("id", id);

  if (error) {
    throw new Error(`Error deactivating account: ${error.message}`);
  }
}

/**
 * Obtiene transacciones contables para calcular saldos
 * Usado para actualizar balances de cuentas
 */
export async function getAccountTransactionsForBalance(
  centroCode: string,
  accountCode: string,
  startDate?: string,
  endDate?: string
): Promise<Array<{ amount: number; movementType: 'debit' | 'credit' }>> {
  let query = supabase
    .from("accounting_transactions")
    .select(`
      amount,
      movement_type,
      accounting_entries!inner(
        centro_code,
        entry_date,
        status
      )
    `)
    .eq("account_code", accountCode)
    .eq("accounting_entries.centro_code", centroCode)
    .eq("accounting_entries.status", "posted");

  if (startDate) {
    query = query.gte("accounting_entries.entry_date", startDate);
  }

  if (endDate) {
    query = query.lte("accounting_entries.entry_date", endDate);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Error fetching account transactions: ${error.message}`);
  }

  return (data || []).map((item: any) => ({
    amount: item.amount,
    movementType: item.movement_type,
  }));
}

/**
 * Obtiene el árbol jerárquico de cuentas PGC
 * Ordenado por longitud de código (grupos primero, luego subcuentas)
 */
export async function getAccountsTree(
  centroCode: string,
  companyId?: string | null
): Promise<Account[]> {
  const accounts = await getAccounts({ 
    centroCode, 
    companyId, 
    active: true 
  });

  // Ordenar para construir jerarquía (Grupo → Subgrupo → Cuenta)
  return accounts.sort((a, b) => {
    const aLen = a.code.length;
    const bLen = b.code.length;
    
    if (aLen !== bLen) return aLen - bLen; // Más cortos primero (grupos)
    return a.code.localeCompare(b.code);
  });
}
