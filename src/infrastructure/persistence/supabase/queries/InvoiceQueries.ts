// ============================================================================
// INVOICE QUERIES - Solo operaciones de lectura (CQRS)
// Separado de Commands para claridad y mantenibilidad
// ============================================================================

import { supabase } from "@/integrations/supabase/client";
import { InvoiceMapper } from "../mappers/InvoiceMapper";
import type { 
  InvoiceReceived, 
  InvoiceIssued, 
  InvoiceFilters,
  InvoiceLine,
  PaginatedInvoices
} from "@/domain/invoicing/types";

/**
 * Clase estática con queries de solo lectura para facturas
 */
export class InvoiceQueries {
  /**
   * Obtiene una factura recibida por ID
   */
  static async findInvoiceReceivedById(
    invoiceId: string
  ): Promise<InvoiceReceived | null> {
    const { data, error } = await supabase
      .from("invoices_received")
      .select(`
        *,
        supplier:suppliers(id, name, tax_id),
        approvals:invoice_approvals(*)
      `)
      .eq("id", invoiceId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return InvoiceMapper.receivedToDomain(data);
  }

  /**
   * Obtiene facturas recibidas con filtros y paginación
   */
  static async findInvoicesReceived(
    filters: InvoiceFilters
  ): Promise<PaginatedInvoices<InvoiceReceived>> {
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const start = (page - 1) * limit;
    const end = start + limit - 1;

    // Query base para aplicar filtros
    let baseQuery = supabase.from("invoices_received").select("*", { count: "exact", head: true });

    // Aplicar filtros a la query de count
    if (filters.centroCode) {
      baseQuery = baseQuery.eq("centro_code", filters.centroCode);
    }
    if (filters.supplierId) {
      baseQuery = baseQuery.eq("supplier_id", filters.supplierId);
    }
    if (filters.status) {
      baseQuery = baseQuery.eq("status", filters.status);
    }
    if (filters.approvalStatus) {
      baseQuery = baseQuery.eq("approval_status", filters.approvalStatus);
    }
    if (filters.dateFrom) {
      baseQuery = baseQuery.gte("invoice_date", filters.dateFrom);
    }
    if (filters.dateTo) {
      baseQuery = baseQuery.lte("invoice_date", filters.dateTo);
    }
    if (filters.searchTerm) {
      baseQuery = baseQuery.ilike("invoice_number", `%${filters.searchTerm}%`);
    }

    // Obtener total de registros
    const { count } = await baseQuery;

    // Query paginada con joins
    let query = supabase
      .from("invoices_received")
      .select(`
        *,
        supplier:suppliers(id, name, tax_id),
        approvals:invoice_approvals(*)
      `)
      .order("invoice_date", { ascending: false })
      .range(start, end);

    // Aplicar mismos filtros
    if (filters.centroCode) {
      query = query.eq("centro_code", filters.centroCode);
    }
    if (filters.supplierId) {
      query = query.eq("supplier_id", filters.supplierId);
    }
    if (filters.status) {
      query = query.eq("status", filters.status);
    }
    if (filters.approvalStatus) {
      query = query.eq("approval_status", filters.approvalStatus);
    }
    if (filters.dateFrom) {
      query = query.gte("invoice_date", filters.dateFrom);
    }
    if (filters.dateTo) {
      query = query.lte("invoice_date", filters.dateTo);
    }
    if (filters.searchTerm) {
      query = query.ilike("invoice_number", `%${filters.searchTerm}%`);
    }

    const { data, error } = await query;
    
    if (error) {
      throw new Error(`Error fetching received invoices: ${error.message}`);
    }

    return {
      data: (data || []).map(InvoiceMapper.receivedToDomain),
      total: count || 0,
      page,
      pageCount: Math.ceil((count || 0) / limit),
    };
  }

  /**
   * Obtiene facturas emitidas con filtros
   */
  static async findInvoicesIssued(
    filters: Omit<InvoiceFilters, 'supplierId' | 'approvalStatus'>
  ): Promise<InvoiceIssued[]> {
    let query = supabase
      .from("invoices_issued")
      .select("*")
      .order("invoice_date", { ascending: false });

    if (filters.centroCode) {
      query = query.eq("centro_code", filters.centroCode);
    }

    if (filters.status) {
      query = query.eq("status", filters.status);
    }

    if (filters.dateFrom) {
      query = query.gte("invoice_date", filters.dateFrom);
    }

    if (filters.dateTo) {
      query = query.lte("invoice_date", filters.dateTo);
    }

    if (filters.searchTerm) {
      query = query.ilike("customer_name", `%${filters.searchTerm}%`);
    }

    const { data, error } = await query;
    
    if (error) {
      throw new Error(`Error fetching issued invoices: ${error.message}`);
    }

    return (data || []).map(InvoiceMapper.issuedToDomain);
  }

  /**
   * Obtiene líneas de factura
   */
  static async getInvoiceLines(
    invoiceId: string,
    invoiceType: 'received' | 'issued'
  ): Promise<InvoiceLine[]> {
    const { data, error } = await supabase
      .from("invoice_lines")
      .select("*")
      .eq("invoice_id", invoiceId)
      .eq("invoice_type", invoiceType)
      .order("line_number");

    if (error) {
      throw new Error(`Error fetching invoice lines: ${error.message}`);
    }

    return (data || []).map(InvoiceMapper.lineToDomain);
  }

  /**
   * Obtiene el siguiente número de factura
   */
  static async getNextInvoiceNumber(
    centroCode: string,
    series: string
  ): Promise<number> {
    const year = new Date().getFullYear();

    const { data: sequence } = await supabase
      .from("invoice_sequences")
      .select("*")
      .eq("centro_code", centroCode)
      .eq("invoice_type", "issued")
      .eq("series", series)
      .eq("year", year)
      .single();

    if (!sequence) {
      // Crear nueva secuencia
      await supabase
        .from("invoice_sequences")
        .insert({
          centro_code: centroCode,
          invoice_type: "issued",
          series,
          year,
          last_number: 0,
        });
      return 1;
    }

    return sequence.last_number + 1;
  }
}
