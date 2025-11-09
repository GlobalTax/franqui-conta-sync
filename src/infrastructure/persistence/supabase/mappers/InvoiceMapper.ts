// ============================================================================
// INVOICE MAPPER
// Convierte entre tipos de DB (snake_case) y tipos de Dominio (camelCase)
// ============================================================================

import type { 
  InvoiceReceived, 
  InvoiceIssued, 
  InvoiceLine,
  InvoiceApproval,
  SupplierInfo 
} from "@/domain/invoicing/types";

export class InvoiceMapper {
  /**
   * Convierte factura recibida de DB a dominio
   */
  static receivedToDomain(dbInvoice: any): InvoiceReceived {
    return {
      id: dbInvoice.id,
      supplierId: dbInvoice.supplier_id,
      centroCode: dbInvoice.centro_code,
      invoiceNumber: dbInvoice.invoice_number,
      invoiceDate: dbInvoice.invoice_date,
      dueDate: dbInvoice.due_date,
      subtotal: dbInvoice.subtotal || 0,
      taxTotal: dbInvoice.tax_total || 0,
      total: dbInvoice.total,
      status: dbInvoice.status,
      documentPath: dbInvoice.document_path,
      entryId: dbInvoice.entry_id,
      paymentTransactionId: dbInvoice.payment_transaction_id,
      ocrConfidence: dbInvoice.ocr_confidence,
      notes: dbInvoice.notes,
      approvalStatus: dbInvoice.approval_status,
      requiresManagerApproval: dbInvoice.requires_manager_approval,
      requiresAccountingApproval: dbInvoice.requires_accounting_approval,
      rejectedBy: dbInvoice.rejected_by,
      rejectedAt: dbInvoice.rejected_at,
      rejectedReason: dbInvoice.rejected_reason,
      createdAt: dbInvoice.created_at,
      updatedAt: dbInvoice.updated_at,
      createdBy: dbInvoice.created_by,
      supplier: dbInvoice.supplier ? this.supplierInfoToDomain(dbInvoice.supplier) : undefined,
      approvals: dbInvoice.approvals ? dbInvoice.approvals.map(this.approvalToDomain) : undefined,
    };
  }

  /**
   * Convierte factura emitida de DB a dominio
   */
  static issuedToDomain(dbInvoice: any): InvoiceIssued {
    return {
      id: dbInvoice.id,
      centroCode: dbInvoice.centro_code,
      customerName: dbInvoice.customer_name,
      customerTaxId: dbInvoice.customer_tax_id,
      customerEmail: dbInvoice.customer_email,
      customerAddress: dbInvoice.customer_address,
      invoiceSeries: dbInvoice.invoice_series,
      invoiceNumber: dbInvoice.invoice_number,
      fullInvoiceNumber: dbInvoice.full_invoice_number,
      invoiceDate: dbInvoice.invoice_date,
      dueDate: dbInvoice.due_date,
      subtotal: dbInvoice.subtotal || 0,
      taxTotal: dbInvoice.tax_total || 0,
      total: dbInvoice.total,
      status: dbInvoice.status,
      entryId: dbInvoice.entry_id,
      paymentTransactionId: dbInvoice.payment_transaction_id,
      pdfPath: dbInvoice.pdf_path,
      sentAt: dbInvoice.sent_at,
      paidAt: dbInvoice.paid_at,
      notes: dbInvoice.notes,
      createdAt: dbInvoice.created_at,
      updatedAt: dbInvoice.updated_at,
      createdBy: dbInvoice.created_by,
    };
  }

  /**
   * Convierte línea de factura de DB a dominio
   */
  static lineToDomain(dbLine: any): InvoiceLine {
    return {
      id: dbLine.id,
      invoiceId: dbLine.invoice_id,
      invoiceType: dbLine.invoice_type,
      lineNumber: dbLine.line_number,
      description: dbLine.description,
      quantity: dbLine.quantity,
      unitPrice: dbLine.unit_price,
      discountPercentage: dbLine.discount_percentage,
      discountAmount: dbLine.discount_amount,
      subtotal: dbLine.subtotal,
      taxRate: dbLine.tax_rate,
      taxAmount: dbLine.tax_amount,
      total: dbLine.total,
      accountCode: dbLine.account_code,
    };
  }

  /**
   * Convierte aprobación de DB a dominio
   */
  static approvalToDomain(dbApproval: any): InvoiceApproval {
    return {
      id: dbApproval.id,
      invoiceId: dbApproval.invoice_id,
      approverId: dbApproval.approver_id,
      approvalLevel: dbApproval.approval_level,
      action: dbApproval.action,
      comments: dbApproval.comments,
      createdAt: dbApproval.created_at,
    };
  }

  /**
   * Convierte info de proveedor de DB a dominio
   */
  static supplierInfoToDomain(dbSupplier: any): SupplierInfo {
    return {
      id: dbSupplier.id,
      name: dbSupplier.name,
      taxId: dbSupplier.tax_id,
    };
  }

  /**
   * Convierte factura recibida de dominio a DB
   */
  static receivedToDatabase(invoice: Partial<InvoiceReceived>): Partial<any> {
    return {
      supplier_id: invoice.supplierId,
      centro_code: invoice.centroCode,
      invoice_number: invoice.invoiceNumber,
      invoice_date: invoice.invoiceDate,
      due_date: invoice.dueDate,
      subtotal: invoice.subtotal,
      tax_total: invoice.taxTotal,
      total: invoice.total,
      status: invoice.status,
      document_path: invoice.documentPath,
      entry_id: invoice.entryId,
      payment_transaction_id: invoice.paymentTransactionId,
      ocr_confidence: invoice.ocrConfidence,
      notes: invoice.notes,
      approval_status: invoice.approvalStatus,
      requires_manager_approval: invoice.requiresManagerApproval,
      requires_accounting_approval: invoice.requiresAccountingApproval,
      rejected_by: invoice.rejectedBy,
      rejected_at: invoice.rejectedAt,
      rejected_reason: invoice.rejectedReason,
      created_by: invoice.createdBy,
    };
  }

  /**
   * Convierte factura emitida de dominio a DB
   */
  static issuedToDatabase(invoice: Partial<InvoiceIssued>): Partial<any> {
    return {
      centro_code: invoice.centroCode,
      customer_name: invoice.customerName,
      customer_tax_id: invoice.customerTaxId,
      customer_email: invoice.customerEmail,
      customer_address: invoice.customerAddress,
      invoice_series: invoice.invoiceSeries,
      invoice_number: invoice.invoiceNumber,
      invoice_date: invoice.invoiceDate,
      due_date: invoice.dueDate,
      subtotal: invoice.subtotal,
      tax_total: invoice.taxTotal,
      total: invoice.total,
      status: invoice.status,
      entry_id: invoice.entryId,
      payment_transaction_id: invoice.paymentTransactionId,
      pdf_path: invoice.pdfPath,
      sent_at: invoice.sentAt,
      paid_at: invoice.paidAt,
      notes: invoice.notes,
      created_by: invoice.createdBy,
    };
  }

  /**
   * Convierte línea de factura de dominio a DB
   */
  static lineToDatabase(line: Partial<InvoiceLine>): Partial<any> {
    return {
      invoice_id: line.invoiceId,
      invoice_type: line.invoiceType,
      line_number: line.lineNumber,
      description: line.description,
      quantity: line.quantity,
      unit_price: line.unitPrice,
      discount_percentage: line.discountPercentage,
      discount_amount: line.discountAmount,
      subtotal: line.subtotal,
      tax_rate: line.taxRate,
      tax_amount: line.taxAmount,
      total: line.total,
      account_code: line.accountCode,
    };
  }
}
