// ============================================================================
// SUPPLIER QUERIES
// Capa de persistencia para proveedores
// ============================================================================

import { supabase } from "@/integrations/supabase/client";
import { SupplierMapper } from "../mappers/SupplierMapper";
import type { Supplier, SupplierFilters } from "@/domain/suppliers/types";

/**
 * Obtiene proveedores con filtros
 */
export async function getSuppliers(
  filters?: SupplierFilters
): Promise<Supplier[]> {
  let query = supabase
    .from("suppliers")
    .select("*")
    .order("name");

  if (filters?.active !== undefined) {
    query = query.eq("active", filters.active);
  }

  if (filters?.country) {
    query = query.eq("country", filters.country);
  }

  if (filters?.search) {
    query = query.or(
      `name.ilike.%${filters.search}%,tax_id.ilike.%${filters.search}%,commercial_name.ilike.%${filters.search}%`
    );
  }

  const { data, error } = await query;
  
  if (error) {
    throw new Error(`Error fetching suppliers: ${error.message}`);
  }

  return (data || []).map(SupplierMapper.toDomain);
}

/**
 * Crea un proveedor
 */
export async function createSupplier(
  supplier: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Supplier> {
  const dbSupplier = SupplierMapper.toDatabase(supplier);

  const { data, error } = await supabase
    .from("suppliers")
    .insert(dbSupplier as any)
    .select()
    .single();

  if (error) {
    throw new Error(`Error creating supplier: ${error.message}`);
  }

  return SupplierMapper.toDomain(data);
}

/**
 * Actualiza un proveedor
 */
export async function updateSupplier(
  id: string,
  updates: Partial<Supplier>
): Promise<Supplier> {
  const dbUpdates = SupplierMapper.toDatabase(updates);

  const { data, error } = await supabase
    .from("suppliers")
    .update(dbUpdates as any)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(`Error updating supplier: ${error.message}`);
  }

  return SupplierMapper.toDomain(data);
}

/**
 * Obtiene un proveedor por su NIF/CIF exacto
 */
export async function getSupplierByTaxId(taxId: string): Promise<Supplier | null> {
  const { data, error } = await supabase
    .from("suppliers")
    .select("*")
    .eq("tax_id", taxId)
    .eq("active", true)
    .maybeSingle();

  if (error) {
    throw new Error(`Error fetching supplier by tax_id: ${error.message}`);
  }

  return data ? SupplierMapper.toDomain(data) : null;
}

/**
 * Desactiva un proveedor (soft delete)
 */
export async function deactivateSupplier(id: string): Promise<void> {
  const { error } = await supabase
    .from("suppliers")
    .update({ active: false })
    .eq("id", id);

  if (error) {
    throw new Error(`Error deactivating supplier: ${error.message}`);
  }
}
