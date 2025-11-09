import { describe, it, expect } from 'vitest';
import { InvoiceMapper } from '../InvoiceMapper';
import type { InvoiceReceived, InvoiceIssued, InvoiceLine } from '@/domain/invoicing/types';

describe('InvoiceMapper', () => {
  describe('receivedToDomain', () => {
    it('convierte factura recibida de DB a dominio correctamente', () => {
      const dbInvoice = {
        id: 'inv-1',
        supplier_id: 'sup-1',
        centro_code: '457',
        invoice_number: 'FAC-2025-001',
        invoice_date: '2025-01-15',
        due_date: '2025-02-15',
        subtotal: 1000,
        tax_total: 210,
        total: 1210,
        status: 'pending',
        document_path: '/docs/invoice.pdf',
        entry_id: null,
        payment_transaction_id: null,
        ocr_confidence: 0.95,
        notes: 'Test invoice',
        approval_status: 'pending_manager',
        requires_manager_approval: true,
        requires_accounting_approval: false,
        rejected_by: null,
        rejected_at: null,
        rejected_reason: null,
        created_at: '2025-01-15T10:00:00Z',
        updated_at: '2025-01-15T10:00:00Z',
        created_by: 'user-1',
      };

      const result = InvoiceMapper.receivedToDomain(dbInvoice);

      expect(result).toEqual({
        id: 'inv-1',
        supplierId: 'sup-1',
        centroCode: '457',
        invoiceNumber: 'FAC-2025-001',
        invoiceDate: '2025-01-15',
        dueDate: '2025-02-15',
        subtotal: 1000,
        taxTotal: 210,
        total: 1210,
        status: 'pending',
        documentPath: '/docs/invoice.pdf',
        entryId: null,
        paymentTransactionId: null,
        ocrConfidence: 0.95,
        notes: 'Test invoice',
        approvalStatus: 'pending_manager',
        requiresManagerApproval: true,
        requiresAccountingApproval: false,
        rejectedBy: null,
        rejectedAt: null,
        rejectedReason: null,
        createdAt: '2025-01-15T10:00:00Z',
        updatedAt: '2025-01-15T10:00:00Z',
        createdBy: 'user-1',
        supplier: undefined,
        approvals: undefined,
      });
    });

    it('incluye información de proveedor cuando está presente', () => {
      const dbInvoice = {
        id: 'inv-1',
        supplier_id: 'sup-1',
        centro_code: '457',
        invoice_number: 'FAC-2025-001',
        invoice_date: '2025-01-15',
        due_date: null,
        subtotal: 1000,
        tax_total: 210,
        total: 1210,
        status: 'pending',
        document_path: null,
        entry_id: null,
        payment_transaction_id: null,
        ocr_confidence: null,
        notes: null,
        approval_status: 'pending_manager',
        requires_manager_approval: true,
        requires_accounting_approval: false,
        rejected_by: null,
        rejected_at: null,
        rejected_reason: null,
        created_at: '2025-01-15T10:00:00Z',
        updated_at: '2025-01-15T10:00:00Z',
        created_by: 'user-1',
        supplier: {
          id: 'sup-1',
          name: 'Test Supplier',
          tax_id: 'B12345678',
        },
      };

      const result = InvoiceMapper.receivedToDomain(dbInvoice);

      expect(result.supplier).toEqual({
        id: 'sup-1',
        name: 'Test Supplier',
        taxId: 'B12345678',
      });
    });
  });

  describe('issuedToDomain', () => {
    it('convierte factura emitida de DB a dominio correctamente', () => {
      const dbInvoice = {
        id: 'inv-issued-1',
        centro_code: '457',
        customer_name: 'Cliente Test',
        customer_tax_id: 'B98765432',
        customer_email: 'cliente@test.com',
        customer_address: 'Calle Test 123',
        invoice_series: 'A',
        invoice_number: 1,
        full_invoice_number: 'A-2025-001',
        invoice_date: '2025-01-15',
        due_date: '2025-02-15',
        subtotal: 500,
        tax_total: 105,
        total: 605,
        status: 'paid',
        entry_id: 'entry-1',
        payment_transaction_id: 'trans-1',
        pdf_path: '/pdfs/invoice.pdf',
        sent_at: '2025-01-15T12:00:00Z',
        paid_at: '2025-01-20T15:00:00Z',
        notes: 'Test issued invoice',
        created_at: '2025-01-15T10:00:00Z',
        updated_at: '2025-01-20T15:00:00Z',
        created_by: 'user-1',
      };

      const result = InvoiceMapper.issuedToDomain(dbInvoice);

      expect(result).toEqual({
        id: 'inv-issued-1',
        centroCode: '457',
        customerName: 'Cliente Test',
        customerTaxId: 'B98765432',
        customerEmail: 'cliente@test.com',
        customerAddress: 'Calle Test 123',
        invoiceSeries: 'A',
        invoiceNumber: 1,
        fullInvoiceNumber: 'A-2025-001',
        invoiceDate: '2025-01-15',
        dueDate: '2025-02-15',
        subtotal: 500,
        taxTotal: 105,
        total: 605,
        status: 'paid',
        entryId: 'entry-1',
        paymentTransactionId: 'trans-1',
        pdfPath: '/pdfs/invoice.pdf',
        sentAt: '2025-01-15T12:00:00Z',
        paidAt: '2025-01-20T15:00:00Z',
        notes: 'Test issued invoice',
        createdAt: '2025-01-15T10:00:00Z',
        updatedAt: '2025-01-20T15:00:00Z',
        createdBy: 'user-1',
      });
    });
  });

  describe('lineToDomain', () => {
    it('convierte línea de factura de DB a dominio correctamente', () => {
      const dbLine = {
        id: 'line-1',
        invoice_id: 'inv-1',
        invoice_type: 'received',
        line_number: 1,
        description: 'Producto Test',
        quantity: 10,
        unit_price: 100,
        discount_percentage: 10,
        discount_amount: 100,
        subtotal: 900,
        tax_rate: 21,
        tax_amount: 189,
        total: 1089,
        account_code: '6000000',
      };

      const result = InvoiceMapper.lineToDomain(dbLine);

      expect(result).toEqual({
        id: 'line-1',
        invoiceId: 'inv-1',
        invoiceType: 'received',
        lineNumber: 1,
        description: 'Producto Test',
        quantity: 10,
        unitPrice: 100,
        discountPercentage: 10,
        discountAmount: 100,
        subtotal: 900,
        taxRate: 21,
        taxAmount: 189,
        total: 1089,
        accountCode: '6000000',
      });
    });
  });

  describe('receivedToDatabase', () => {
    it('convierte factura recibida de dominio a DB correctamente', () => {
      const domainInvoice: Partial<InvoiceReceived> = {
        supplierId: 'sup-1',
        centroCode: '457',
        invoiceNumber: 'FAC-2025-001',
        invoiceDate: '2025-01-15',
        dueDate: '2025-02-15',
        subtotal: 1000,
        taxTotal: 210,
        total: 1210,
        status: 'pending',
        approvalStatus: 'pending_manager',
        requiresManagerApproval: true,
        requiresAccountingApproval: false,
      };

      const result = InvoiceMapper.receivedToDatabase(domainInvoice);

      expect(result).toEqual({
        supplier_id: 'sup-1',
        centro_code: '457',
        invoice_number: 'FAC-2025-001',
        invoice_date: '2025-01-15',
        due_date: '2025-02-15',
        subtotal: 1000,
        tax_total: 210,
        total: 1210,
        status: 'pending',
        document_path: undefined,
        entry_id: undefined,
        payment_transaction_id: undefined,
        ocr_confidence: undefined,
        notes: undefined,
        approval_status: 'pending_manager',
        requires_manager_approval: true,
        requires_accounting_approval: false,
        rejected_by: undefined,
        rejected_at: undefined,
        rejected_reason: undefined,
        created_by: undefined,
      });
    });
  });

  describe('issuedToDatabase', () => {
    it('convierte factura emitida de dominio a DB correctamente', () => {
      const domainInvoice: Partial<InvoiceIssued> = {
        centroCode: '457',
        customerName: 'Cliente Test',
        customerTaxId: 'B98765432',
        invoiceSeries: 'A',
        invoiceNumber: 1,
        invoiceDate: '2025-01-15',
        subtotal: 500,
        taxTotal: 105,
        total: 605,
        status: 'paid',
      };

      const result = InvoiceMapper.issuedToDatabase(domainInvoice);

      expect(result).toEqual({
        centro_code: '457',
        customer_name: 'Cliente Test',
        customer_tax_id: 'B98765432',
        customer_email: undefined,
        customer_address: undefined,
        invoice_series: 'A',
        invoice_number: 1,
        invoice_date: '2025-01-15',
        due_date: undefined,
        subtotal: 500,
        tax_total: 105,
        total: 605,
        status: 'paid',
        entry_id: undefined,
        payment_transaction_id: undefined,
        pdf_path: undefined,
        sent_at: undefined,
        paid_at: undefined,
        notes: undefined,
        created_by: undefined,
      });
    });
  });

  describe('lineToDatabase', () => {
    it('convierte línea de factura de dominio a DB correctamente', () => {
      const domainLine: Partial<InvoiceLine> = {
        invoiceId: 'inv-1',
        invoiceType: 'received',
        lineNumber: 1,
        description: 'Producto Test',
        quantity: 10,
        unitPrice: 100,
        discountPercentage: 10,
        discountAmount: 100,
        subtotal: 900,
        taxRate: 21,
        taxAmount: 189,
        total: 1089,
        accountCode: '6000000',
      };

      const result = InvoiceMapper.lineToDatabase(domainLine);

      expect(result).toEqual({
        invoice_id: 'inv-1',
        invoice_type: 'received',
        line_number: 1,
        description: 'Producto Test',
        quantity: 10,
        unit_price: 100,
        discount_percentage: 10,
        discount_amount: 100,
        subtotal: 900,
        tax_rate: 21,
        tax_amount: 189,
        total: 1089,
        account_code: '6000000',
      });
    });
  });
});
