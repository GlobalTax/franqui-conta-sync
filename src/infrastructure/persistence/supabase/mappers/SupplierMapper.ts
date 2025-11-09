// ============================================================================
// SUPPLIER MAPPER
// Convierte entre tipos de DB (snake_case) y tipos de Dominio (camelCase)
// ============================================================================

import type { Supplier } from "@/domain/suppliers/types";

export class SupplierMapper {
  /**
   * Convierte proveedor de DB a dominio
   */
  static toDomain(dbSupplier: any): Supplier {
    return {
      id: dbSupplier.id,
      taxId: dbSupplier.tax_id,
      name: dbSupplier.name,
      commercialName: dbSupplier.commercial_name,
      email: dbSupplier.email,
      phone: dbSupplier.phone,
      address: dbSupplier.address,
      city: dbSupplier.city,
      postalCode: dbSupplier.postal_code,
      country: dbSupplier.country,
      paymentTerms: dbSupplier.payment_terms,
      defaultAccountCode: dbSupplier.default_account_code,
      notes: dbSupplier.notes,
      active: dbSupplier.active,
      createdAt: dbSupplier.created_at,
      updatedAt: dbSupplier.updated_at,
    };
  }

  /**
   * Convierte proveedor de dominio a DB
   */
  static toDatabase(supplier: Partial<Supplier>): Partial<any> {
    return {
      tax_id: supplier.taxId,
      name: supplier.name,
      commercial_name: supplier.commercialName,
      email: supplier.email,
      phone: supplier.phone,
      address: supplier.address,
      city: supplier.city,
      postal_code: supplier.postalCode,
      country: supplier.country,
      payment_terms: supplier.paymentTerms,
      default_account_code: supplier.defaultAccountCode,
      notes: supplier.notes,
      active: supplier.active,
    };
  }
}
