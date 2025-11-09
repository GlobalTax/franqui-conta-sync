// ============================================================================
// Entry Queries - Gestión de Asientos Contables
// Centraliza todas las operaciones de persistencia de asientos y transacciones
// ============================================================================

import { supabase } from "@/integrations/supabase/client";
import { EntryMapper } from "../mappers/EntryMapper";
import type { JournalEntry } from "@/domain/accounting/types";

export interface EntryFilters {
  centroCode?: string;
  companyId?: string;
  fiscalYearId?: string;
  status?: 'draft' | 'posted' | 'closed';
  startDate?: string;
  endDate?: string;
  searchTerm?: string; // Para buscar en descripción o número de asiento
}

export interface PaginationOptions {
  limit?: number;
  offset?: number;
  orderBy?: 'entry_date' | 'entry_number' | 'created_at';
  orderDirection?: 'asc' | 'desc';
}

/**
 * Obtiene asientos contables con filtros y paginación
 */
export async function getJournalEntries(
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
    // Buscar en descripción o número de asiento
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
  
  // Orden secundario por entry_number
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
export async function getJournalEntryById(id: string): Promise<JournalEntry | null> {
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
 * Crea un nuevo asiento contable con sus transacciones
 * NOTA: La validación de negocio (cuadre, etc.) debe hacerse ANTES en la capa de dominio
 */
export async function createJournalEntry(
  entry: Omit<JournalEntry, "id" | "entryNumber" | "createdAt" | "updatedAt">,
  nextEntryNumber: number
): Promise<JournalEntry> {
  const dbData = EntryMapper.toDatabase(entry, nextEntryNumber);

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
  const result = await getJournalEntryById(newEntry.id);
  if (!result) {
    throw new Error("Failed to retrieve created entry");
  }
  
  return result;
}

/**
 * Actualiza un asiento (solo si está en draft)
 */
export async function updateJournalEntry(
  id: string,
  updates: Partial<JournalEntry>
): Promise<JournalEntry> {
  // Verificar que esté en draft
  const existing = await getJournalEntryById(id);
  if (!existing) {
    throw new Error("Journal entry not found");
  }
  if (existing.status !== 'draft') {
    throw new Error("Cannot update posted or closed entries");
  }

  const dbUpdates = EntryMapper.toDatabase(updates, existing.entryNumber);

  const { error } = await supabase
    .from("accounting_entries")
    .update(dbUpdates.entry as any)
    .eq("id", id);

  if (error) {
    throw new Error(`Error updating journal entry: ${error.message}`);
  }

  const result = await getJournalEntryById(id);
  if (!result) {
    throw new Error("Failed to retrieve updated entry");
  }
  
  return result;
}

/**
 * Elimina un asiento (solo si está en draft)
 */
export async function deleteJournalEntry(id: string): Promise<void> {
  const existing = await getJournalEntryById(id);
  if (!existing) {
    throw new Error("Journal entry not found");
  }
  if (existing.status !== 'draft') {
    throw new Error("Cannot delete posted or closed entries");
  }

  // Eliminar transacciones primero (o confiar en CASCADE)
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
 * Cambia el estado de un asiento (draft → posted → closed)
 */
export async function updateEntryStatus(
  id: string,
  newStatus: 'draft' | 'posted' | 'closed'
): Promise<void> {
  const { error } = await supabase
    .from("accounting_entries")
    .update({ status: newStatus })
    .eq("id", id);

  if (error) {
    throw new Error(`Error updating entry status: ${error.message}`);
  }
}

/**
 * Obtiene el siguiente número de asiento para un ejercicio fiscal
 */
export async function getNextEntryNumber(fiscalYearId: string): Promise<number> {
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
