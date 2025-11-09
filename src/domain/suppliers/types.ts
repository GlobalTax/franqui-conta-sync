// ============================================================================
// TIPOS DE DOMINIO - PROVEEDORES
// Tipos para gestión de proveedores independientes de infraestructura
// ============================================================================

/**
 * Proveedor
 */
export interface Supplier {
  id: string;
  taxId: string;
  name: string;
  commercialName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  country: string;
  paymentTerms: number;
  defaultAccountCode: string | null;
  notes: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Filtros para consulta de proveedores
 */
export interface SupplierFilters {
  search?: string;
  active?: boolean;
  country?: string;
  hasEmail?: boolean;
}
