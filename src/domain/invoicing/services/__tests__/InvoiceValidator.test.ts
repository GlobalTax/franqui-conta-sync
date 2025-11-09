import { describe, it, expect } from 'vitest';
import { InvoiceValidator } from '../InvoiceValidator';
import type { InvoiceReceived, InvoiceLine } from '../../types';

describe('InvoiceValidator', () => {
  const createValidInvoice = (): Partial<InvoiceReceived> => ({
    supplierId: 'supplier-123',
    invoiceNumber: 'F2025-001',
    invoiceDate: '2025-01-15',
    total: 100,
  });

  const createValidLine = (): InvoiceLine => ({
    id: 'line-1',
    invoiceId: 'invoice-1',
    invoiceType: 'received',
    lineNumber: 1,
    description: 'Producto de prueba',
    quantity: 1,
    unitPrice: 100,
    discountPercentage: 0,
    discountAmount: 0,
    subtotal: 100,
    taxRate: 21,
    taxAmount: 21,
    total: 121,
    accountCode: '6000000',
  });

  describe('validateInvoiceReceived', () => {
    it('debe validar una factura correcta', () => {
      const invoice = createValidInvoice();
      const lines = [createValidLine()];

      const result = InvoiceValidator.validateInvoiceReceived(invoice, lines);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('debe rechazar factura sin proveedor', () => {
      const invoice = { ...createValidInvoice(), supplierId: undefined };
      const lines = [createValidLine()];

      const result = InvoiceValidator.validateInvoiceReceived(invoice, lines);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ code: 'SUPPLIER_REQUIRED' })
      );
    });

    it('debe rechazar factura sin número', () => {
      const invoice = { ...createValidInvoice(), invoiceNumber: '' };
      const lines = [createValidLine()];

      const result = InvoiceValidator.validateInvoiceReceived(invoice, lines);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ code: 'INVOICE_NUMBER_REQUIRED' })
      );
    });

    it('debe rechazar factura sin fecha', () => {
      const invoice = { ...createValidInvoice(), invoiceDate: undefined };
      const lines = [createValidLine()];

      const result = InvoiceValidator.validateInvoiceReceived(invoice, lines);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ code: 'INVOICE_DATE_REQUIRED' })
      );
    });

    it('debe rechazar factura con fecha futura', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);
      
      const invoice = {
        ...createValidInvoice(),
        invoiceDate: futureDate.toISOString().split('T')[0],
      };
      const lines = [createValidLine()];

      const result = InvoiceValidator.validateInvoiceReceived(invoice, lines);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ code: 'FUTURE_INVOICE_DATE' })
      );
    });

    it('debe rechazar factura sin líneas', () => {
      const invoice = createValidInvoice();
      const lines: InvoiceLine[] = [];

      const result = InvoiceValidator.validateInvoiceReceived(invoice, lines);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ code: 'LINES_REQUIRED' })
      );
    });

    it('debe rechazar factura con total muy bajo', () => {
      const invoice = { ...createValidInvoice(), total: 0 };
      const lines = [createValidLine()];

      const result = InvoiceValidator.validateInvoiceReceived(invoice, lines);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ code: 'TOTAL_TOO_LOW' })
      );
    });
  });

  describe('validateInvoiceLine', () => {
    it('debe validar una línea correcta', () => {
      const line = createValidLine();
      const errors = InvoiceValidator.validateInvoiceLine(line, 0);

      expect(errors).toHaveLength(0);
    });

    it('debe rechazar línea sin descripción', () => {
      const line = { ...createValidLine(), description: '' };
      const errors = InvoiceValidator.validateInvoiceLine(line, 0);

      expect(errors).toContainEqual(
        expect.objectContaining({ code: 'LINE_DESCRIPTION_REQUIRED' })
      );
    });

    it('debe rechazar línea con cantidad negativa', () => {
      const line = { ...createValidLine(), quantity: -1 };
      const errors = InvoiceValidator.validateInvoiceLine(line, 0);

      expect(errors).toContainEqual(
        expect.objectContaining({ code: 'INVALID_QUANTITY' })
      );
    });

    it('debe rechazar línea con precio negativo', () => {
      const line = { ...createValidLine(), unitPrice: -10 };
      const errors = InvoiceValidator.validateInvoiceLine(line, 0);

      expect(errors).toContainEqual(
        expect.objectContaining({ code: 'INVALID_UNIT_PRICE' })
      );
    });

    it('debe rechazar línea con descuento > 100%', () => {
      const line = { ...createValidLine(), discountPercentage: 150 };
      const errors = InvoiceValidator.validateInvoiceLine(line, 0);

      expect(errors).toContainEqual(
        expect.objectContaining({ code: 'INVALID_DISCOUNT' })
      );
    });

    it('debe rechazar línea con tasa de IVA inválida', () => {
      const line = { ...createValidLine(), taxRate: 15 };
      const errors = InvoiceValidator.validateInvoiceLine(line, 0);

      expect(errors).toContainEqual(
        expect.objectContaining({ code: 'INVALID_TAX_RATE' })
      );
    });

    it('debe aceptar tasas de IVA válidas (0, 4, 10, 21)', () => {
      [0, 4, 10, 21].forEach((rate) => {
        const line = { ...createValidLine(), taxRate: rate };
        const errors = InvoiceValidator.validateInvoiceLine(line, 0);

        expect(errors.filter((e) => e.code === 'INVALID_TAX_RATE')).toHaveLength(0);
      });
    });

    it('debe rechazar cuenta contable inválida', () => {
      const line = { ...createValidLine(), accountCode: '123' }; // Muy corta
      const errors = InvoiceValidator.validateInvoiceLine(line, 0);

      expect(errors).toContainEqual(
        expect.objectContaining({ code: 'INVALID_ACCOUNT_CODE' })
      );
    });
  });

  describe('canChangeStatus', () => {
    it('debe permitir pending_manager -> approved', () => {
      const result = InvoiceValidator.canChangeStatus('pending_manager', 'approved');
      expect(result.isValid).toBe(true);
    });

    it('debe permitir pending_manager -> rejected', () => {
      const result = InvoiceValidator.canChangeStatus('pending_manager', 'rejected');
      expect(result.isValid).toBe(true);
    });

    it('debe permitir pending_accounting -> approved', () => {
      const result = InvoiceValidator.canChangeStatus('pending_accounting', 'approved');
      expect(result.isValid).toBe(true);
    });

    it('debe rechazar approved -> rejected', () => {
      const result = InvoiceValidator.canChangeStatus('approved', 'rejected');
      expect(result.isValid).toBe(false);
    });

    it('debe rechazar rejected -> approved', () => {
      const result = InvoiceValidator.canChangeStatus('rejected', 'approved');
      expect(result.isValid).toBe(false);
    });
  });

  describe('canApprove', () => {
    it('debe permitir aprobar factura pending', () => {
      const invoice = {
        ...createValidInvoice(),
        approvalStatus: 'pending_manager',
      } as InvoiceReceived;

      const result = InvoiceValidator.canApprove(invoice);
      expect(result.isValid).toBe(true);
    });

    it('debe rechazar factura ya aprobada', () => {
      const invoice = {
        ...createValidInvoice(),
        approvalStatus: 'approved',
      } as InvoiceReceived;

      const result = InvoiceValidator.canApprove(invoice);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ code: 'ALREADY_APPROVED' })
      );
    });

    it('debe rechazar factura ya rechazada', () => {
      const invoice = {
        ...createValidInvoice(),
        approvalStatus: 'rejected',
      } as InvoiceReceived;

      const result = InvoiceValidator.canApprove(invoice);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ code: 'ALREADY_REJECTED' })
      );
    });
  });

  describe('canReject', () => {
    it('debe permitir rechazar factura pending', () => {
      const invoice = {
        ...createValidInvoice(),
        approvalStatus: 'pending_manager',
      } as InvoiceReceived;

      const result = InvoiceValidator.canReject(invoice);
      expect(result.isValid).toBe(true);
    });

    it('debe rechazar factura ya aprobada', () => {
      const invoice = {
        ...createValidInvoice(),
        approvalStatus: 'approved',
      } as InvoiceReceived;

      const result = InvoiceValidator.canReject(invoice);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ code: 'CANNOT_REJECT_APPROVED' })
      );
    });
  });
});
