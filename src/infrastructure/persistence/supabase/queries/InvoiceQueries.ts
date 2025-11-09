// ============================================================================
// INVOICE QUERIES
// Capa de persistencia para facturas (received e issued)
// ============================================================================

import { supabase } from "@/integrations/supabase/client";
import { InvoiceMapper } from "../mappers/InvoiceMapper";
import type { 
  InvoiceReceived, 
  InvoiceIssued, 
  InvoiceFilters,
  InvoiceLine 
} from "@/domain/invoicing/types";

/**
 * Obtiene una factura recibida por ID
 */
export async function getInvoiceReceivedById(
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
 * Obtiene facturas recibidas con filtros
 */
export async function getInvoicesReceived(
  filters: InvoiceFilters
): Promise<InvoiceReceived[]> {
  let query = supabase
    .from("invoices_received")
    .select(`
      *,
      supplier:suppliers(id, name, tax_id),
      approvals:invoice_approvals(*)
    `)
    .order("invoice_date", { ascending: false });

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

  return (data || []).map(InvoiceMapper.receivedToDomain);
}

/**
 * Obtiene facturas emitidas con filtros
 */
export async function getInvoicesIssued(
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
export async function getInvoiceLines(
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
 * Crea una factura recibida con líneas
 */
export async function createInvoiceReceived(
  invoice: Omit<InvoiceReceived, 'id' | 'createdAt' | 'updatedAt'>,
  lines: Omit<InvoiceLine, 'id' | 'invoiceId'>[]
): Promise<InvoiceReceived> {
  const dbInvoice = InvoiceMapper.receivedToDatabase(invoice);

  const { data: newInvoice, error: invoiceError } = await supabase
    .from("invoices_received")
    .insert(dbInvoice as any)
    .select()
    .single();

  if (invoiceError) {
    throw new Error(`Error creating received invoice: ${invoiceError.message}`);
  }

  // Insertar líneas
  if (lines.length > 0) {
    const dbLines = lines.map((line, index) => ({
      ...InvoiceMapper.lineToDatabase(line),
      invoice_id: newInvoice.id,
      invoice_type: 'received',
      line_number: index + 1,
    }));

    const { error: linesError } = await supabase
      .from("invoice_lines")
      .insert(dbLines as any);

    if (linesError) {
      // Rollback
      await supabase.from("invoices_received").delete().eq("id", newInvoice.id);
      throw new Error(`Error creating invoice lines: ${linesError.message}`);
    }
  }

  return InvoiceMapper.receivedToDomain(newInvoice);
}

/**
 * Crea una factura emitida con líneas
 */
export async function createInvoiceIssued(
  invoice: Omit<InvoiceIssued, 'id' | 'createdAt' | 'updatedAt' | 'invoiceNumber' | 'fullInvoiceNumber'>,
  lines: Omit<InvoiceLine, 'id' | 'invoiceId'>[]
): Promise<InvoiceIssued> {
  // Obtener siguiente número de factura
  const nextNumber = await getNextInvoiceNumber(
    invoice.centroCode,
    invoice.invoiceSeries
  );

  const dbInvoice = {
    ...InvoiceMapper.issuedToDatabase(invoice),
    invoice_number: nextNumber,
  };

  const { data: newInvoice, error: invoiceError } = await supabase
    .from("invoices_issued")
    .insert(dbInvoice as any)
    .select()
    .single();

  if (invoiceError) {
    throw new Error(`Error creating issued invoice: ${invoiceError.message}`);
  }

  // Actualizar secuencia
  await updateInvoiceSequence(invoice.centroCode, invoice.invoiceSeries, nextNumber);

  // Insertar líneas
  if (lines.length > 0) {
    const dbLines = lines.map((line, index) => ({
      ...InvoiceMapper.lineToDatabase(line),
      invoice_id: newInvoice.id,
      invoice_type: 'issued',
      line_number: index + 1,
    }));

    const { error: linesError } = await supabase
      .from("invoice_lines")
      .insert(dbLines as any);

    if (linesError) {
      // Rollback
      await supabase.from("invoices_issued").delete().eq("id", newInvoice.id);
      throw new Error(`Error creating invoice lines: ${linesError.message}`);
    }
  }

  return InvoiceMapper.issuedToDomain(newInvoice);
}

/**
 * Obtiene el siguiente número de factura
 */
export async function getNextInvoiceNumber(
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

/**
 * Actualiza la secuencia de facturación
 */
export async function updateInvoiceSequence(
  centroCode: string,
  series: string,
  lastNumber: number
): Promise<void> {
  const year = new Date().getFullYear();

  await supabase
    .from("invoice_sequences")
    .update({ last_number: lastNumber })
    .eq("centro_code", centroCode)
    .eq("invoice_type", "issued")
    .eq("series", series)
    .eq("year", year);
}

/**
 * Actualiza una factura recibida
 */
export async function updateInvoiceReceived(
  id: string,
  updates: Partial<InvoiceReceived>
): Promise<InvoiceReceived> {
  const dbUpdates = InvoiceMapper.receivedToDatabase(updates);

  const { data, error } = await supabase
    .from("invoices_received")
    .update(dbUpdates as any)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(`Error updating received invoice: ${error.message}`);
  }

  return InvoiceMapper.receivedToDomain(data);
}

/**
 * Actualiza una factura emitida
 */
export async function updateInvoiceIssued(
  id: string,
  updates: Partial<InvoiceIssued>
): Promise<InvoiceIssued> {
  const dbUpdates = InvoiceMapper.issuedToDatabase(updates);

  const { data, error } = await supabase
    .from("invoices_issued")
    .update(dbUpdates as any)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(`Error updating issued invoice: ${error.message}`);
  }

  return InvoiceMapper.issuedToDomain(data);
}
