// ============================================================================
// ACCOUNTING QUERIES - Solo operaciones de lectura (CQRS)
// Separado de Commands para claridad y mantenibilidad
// ============================================================================

import { supabase } from "@/integrations/supabase/client";
import { EntryMapper } from "../mappers/EntryMapper";
import type { JournalEntry } from "@/domain/accounting/types";
import type { EntryFilters, PaginationOptions } from "@/domain/accounting/repositories/IAccountingRepository";

/**
 * Clase estática con queries de solo lectura para operaciones contables
 */
export class AccountingQueries {
  /**
   * Obtiene asientos contables con filtros y paginación
   */
  static async findEntries(
    filters: EntryFilters,
    options?: PaginationOptions
  ): Promise<{ entries: JournalEntry[]; total: number }> {
    let query = supabase
      .from("accounting_entries")
      .select(`
        *,
        accounting_transactions(*)
      `, { count: 'exact' });

    // Aplicar filtros
    if (filters.centroCode) {
      query = query.eq("centro_code", filters.centroCode);
    }

    if (filters.fiscalYearId) {
      query = query.eq("fiscal_year_id", filters.fiscalYearId);
    }

    if (filters.status) {
      query = query.eq("status", filters.status);
    }

    if (filters.startDate) {
      query = query.gte("entry_date", filters.startDate);
    }

    if (filters.endDate) {
      query = query.lte("entry_date", filters.endDate);
    }

    if (filters.searchTerm) {
      const numericSearch = parseInt(filters.searchTerm);
      if (!isNaN(numericSearch)) {
        query = query.or(`description.ilike.%${filters.searchTerm}%,entry_number.eq.${numericSearch}`);
      } else {
        query = query.ilike("description", `%${filters.searchTerm}%`);
      }
    }

    // Ordenamiento
    const orderBy = options?.orderBy || 'entry_date';
    const orderDirection = options?.orderDirection || 'desc';
    query = query.order(orderBy, { ascending: orderDirection === 'asc' });
    
    if (orderBy !== 'entry_number') {
      query = query.order('entry_number', { ascending: orderDirection === 'asc' });
    }

    // Paginación
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Error fetching journal entries: ${error.message}`);
    }

    return {
      entries: (data || []).map(EntryMapper.toDomain),
      total: count || 0,
    };
  }

  /**
   * Obtiene un asiento por ID con sus transacciones
   */
  static async findEntryById(id: string): Promise<JournalEntry | null> {
    const { data, error } = await supabase
      .from("accounting_entries")
      .select(`
        *,
        accounting_transactions(*)
      `)
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new Error(`Error fetching journal entry: ${error.message}`);
    }

    return data ? EntryMapper.toDomain(data) : null;
  }

  /**
   * Obtiene el siguiente número de asiento para un ejercicio fiscal
   */
  static async getNextEntryNumber(fiscalYearId: string): Promise<number> {
    const { data, error } = await supabase
      .from("accounting_entries")
      .select("entry_number")
      .eq("fiscal_year_id", fiscalYearId)
      .order("entry_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(`Error fetching next entry number: ${error.message}`);
    }

    return (data?.entry_number || 0) + 1;
  }
}
