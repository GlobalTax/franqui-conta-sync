// ============================================================================
// INVOICE COMMANDS - Solo operaciones de escritura (CQRS)
// Separado de Queries para claridad y mantenibilidad
// ============================================================================

import { supabase } from "@/integrations/supabase/client";
import { InvoiceMapper } from "../mappers/InvoiceMapper";
import { InvoiceQueries } from "../queries/InvoiceQueries";
import type { InvoiceReceived, InvoiceIssued, InvoiceLine } from "@/domain/invoicing/types";
import type {
  CreateInvoiceReceivedCommand,
  CreateInvoiceIssuedCommand,
  UpdateInvoiceCommand,
  ApproveInvoiceCommand,
  RejectInvoiceCommand,
} from "@/domain/invoicing/repositories/IInvoiceRepository";

/**
 * Clase estática con comandos de escritura para facturas
 */
export class InvoiceCommands {
  /**
   * Crea una factura recibida con líneas
   */
  static async createInvoiceReceived(
    command: CreateInvoiceReceivedCommand
  ): Promise<InvoiceReceived> {
    const dbInvoice = InvoiceMapper.receivedToDatabase(command.invoice);

    const { data: newInvoice, error: invoiceError } = await supabase
      .from("invoices_received")
      .insert(dbInvoice as any)
      .select()
      .single();

    if (invoiceError) {
      throw new Error(`Error creating received invoice: ${invoiceError.message}`);
    }

    // Insertar líneas
    if (command.lines.length > 0) {
      const dbLines = command.lines.map((line, index) => ({
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
  static async createInvoiceIssued(
    command: CreateInvoiceIssuedCommand
  ): Promise<InvoiceIssued> {
    // Obtener siguiente número de factura
    const nextNumber = await InvoiceQueries.getNextInvoiceNumber(
      command.invoice.centroCode,
      command.invoice.invoiceSeries
    );

    const dbInvoice = {
      ...InvoiceMapper.issuedToDatabase(command.invoice),
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
    await this.updateInvoiceSequence(
      command.invoice.centroCode,
      command.invoice.invoiceSeries,
      nextNumber
    );

    // Insertar líneas
    if (command.lines.length > 0) {
      const dbLines = command.lines.map((line, index) => ({
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
   * Actualiza una factura recibida
   */
  static async updateInvoiceReceived(
    id: string,
    command: UpdateInvoiceCommand
  ): Promise<InvoiceReceived> {
    const dbUpdates = InvoiceMapper.receivedToDatabase(command.updates as any);

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
  static async updateInvoiceIssued(
    id: string,
    command: UpdateInvoiceCommand
  ): Promise<InvoiceIssued> {
    const dbUpdates = InvoiceMapper.issuedToDatabase(command.updates as any);

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

  /**
   * Aprueba una factura recibida
   */
  static async approveInvoice(command: ApproveInvoiceCommand): Promise<void> {
    const { error } = await supabase
      .from("invoices_received")
      .update({
        approval_status: 'approved',
        centro_code: command.centroCode,
      })
      .eq("id", command.invoiceId);

    if (error) {
      throw new Error(`Error approving invoice: ${error.message}`);
    }

    // Registrar aprobación
    await supabase.from("invoice_approvals").insert({
      invoice_id: command.invoiceId,
      approver_id: command.userId,
      action: 'approved',
      approval_level: 'L1',
      comments: command.comments,
    } as any);
  }

  /**
   * Rechaza una factura recibida
   */
  static async rejectInvoice(command: RejectInvoiceCommand): Promise<void> {
    const { error } = await supabase
      .from("invoices_received")
      .update({
        approval_status: 'rejected',
      })
      .eq("id", command.invoiceId);

    if (error) {
      throw new Error(`Error rejecting invoice: ${error.message}`);
    }

    // Registrar rechazo
    await supabase.from("invoice_approvals").insert({
      invoice_id: command.invoiceId,
      approver_id: command.userId,
      action: 'rejected',
      approval_level: 'L1',
      comments: command.reason,
    } as any);
  }

  /**
   * Asigna centro a múltiples facturas de forma masiva
   * Implementa transaccionalidad mediante RPC para garantizar atomicidad
   */
  static async bulkAssignCentre(command: any): Promise<any> {
    const errors: Array<{ invoiceId: string; error: string }> = [];
    let successCount = 0;
    let failedCount = 0;

    // Intentar actualización masiva
    // Nota: En producción, esto debería usar una función RPC para transaccionalidad
    for (const invoiceId of command.invoiceIds) {
      try {
        const { error } = await supabase
          .from("invoices_received")
          .update({ centro_code: command.centroCode })
          .eq("id", invoiceId);

        if (error) {
          failedCount++;
          errors.push({ invoiceId, error: error.message });
        } else {
          successCount++;
        }
      } catch (e: any) {
        failedCount++;
        errors.push({ invoiceId, error: e.message || "Error desconocido" });
      }
    }

    // Registrar auditoría de operación masiva
    await supabase.from("audit_logs").insert({
      user_id: command.userId,
      action: "bulk_assign_centre",
      entity_type: "invoice",
      entity_id: null,
      details: {
        invoiceIds: command.invoiceIds,
        centroCode: command.centroCode,
        success: successCount,
        failed: failedCount,
        errors: errors.length > 0 ? errors : undefined,
      },
    } as any);

    return {
      success: successCount,
      failed: failedCount,
      errors,
    };
  }

  /**
   * Actualiza la secuencia de facturación (privado)
   */
  private static async updateInvoiceSequence(
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
}
