// ============================================================================
// SERVICIO DE DOMINIO - INVOICE VALIDATOR
// Responsabilidad: Validar reglas de negocio para facturas antes de persistir
// ============================================================================

import type { InvoiceReceived, InvoiceIssued, InvoiceLine, ApprovalStatus } from '../types';
import { PGCValidator } from '@/domain/accounting/services/PGCValidator';

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

/**
 * Servicio de validaciones para facturas (recibidas y emitidas)
 * Centraliza todas las reglas de negocio relacionadas con validación
 */
export class InvoiceValidator {
  private static readonly VALID_TAX_RATES = [0, 4, 10, 21];
  private static readonly MIN_AMOUNT = 0.01;
  private static readonly MAX_DISCOUNT = 100;

  /**
   * Valida una factura recibida completa antes de crearla o actualizarla
   * @param invoice - Datos de la factura a validar
   * @param lines - Líneas de la factura
   * @returns Resultado de validación con errores si los hay
   */
  static validateInvoiceReceived(
    invoice: Partial<InvoiceReceived>,
    lines: InvoiceLine[]
  ): ValidationResult {
    const errors: ValidationError[] = [];

    // Validar proveedor
    if (!invoice.supplierId) {
      errors.push({
        field: 'supplierId',
        message: 'El proveedor es obligatorio',
        code: 'SUPPLIER_REQUIRED',
      });
    }

    // Validar número de factura
    if (!invoice.invoiceNumber || invoice.invoiceNumber.trim() === '') {
      errors.push({
        field: 'invoiceNumber',
        message: 'El número de factura es obligatorio',
        code: 'INVOICE_NUMBER_REQUIRED',
      });
    }

    // Validar fecha
    if (!invoice.invoiceDate) {
      errors.push({
        field: 'invoiceDate',
        message: 'La fecha de factura es obligatoria',
        code: 'INVOICE_DATE_REQUIRED',
      });
    } else {
      // Validar que la fecha no sea futura
      const invoiceDate = new Date(invoice.invoiceDate);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      
      if (invoiceDate > today) {
        errors.push({
          field: 'invoiceDate',
          message: 'La fecha de factura no puede ser futura',
          code: 'FUTURE_INVOICE_DATE',
        });
      }
    }

    // Validar que haya al menos una línea
    if (lines.length === 0) {
      errors.push({
        field: 'lines',
        message: 'La factura debe tener al menos una línea',
        code: 'LINES_REQUIRED',
      });
    }

    // Validar líneas individuales
    lines.forEach((line, index) => {
      const lineErrors = this.validateInvoiceLine(line, index);
      errors.push(...lineErrors);
    });

    // Validar que los totales sean positivos
    if (invoice.total !== undefined && invoice.total < this.MIN_AMOUNT) {
      errors.push({
        field: 'total',
        message: `El total debe ser al menos ${this.MIN_AMOUNT}€`,
        code: 'TOTAL_TOO_LOW',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Valida una factura emitida completa
   */
  static validateInvoiceIssued(
    invoice: Partial<InvoiceIssued>,
    lines: InvoiceLine[]
  ): ValidationResult {
    const errors: ValidationError[] = [];

    // Validar cliente
    if (!invoice.customerName || invoice.customerName.trim() === '') {
      errors.push({
        field: 'customerName',
        message: 'El nombre del cliente es obligatorio',
        code: 'CUSTOMER_NAME_REQUIRED',
      });
    }

    // Validar serie y número
    if (!invoice.invoiceSeries || invoice.invoiceSeries.trim() === '') {
      errors.push({
        field: 'invoiceSeries',
        message: 'La serie de factura es obligatoria',
        code: 'INVOICE_SERIES_REQUIRED',
      });
    }

    if (!invoice.invoiceNumber) {
      errors.push({
        field: 'invoiceNumber',
        message: 'El número de factura es obligatorio',
        code: 'INVOICE_NUMBER_REQUIRED',
      });
    }

    // Validar fecha
    if (!invoice.invoiceDate) {
      errors.push({
        field: 'invoiceDate',
        message: 'La fecha de factura es obligatoria',
        code: 'INVOICE_DATE_REQUIRED',
      });
    }

    // Validar líneas
    if (lines.length === 0) {
      errors.push({
        field: 'lines',
        message: 'La factura debe tener al menos una línea',
        code: 'LINES_REQUIRED',
      });
    }

    lines.forEach((line, index) => {
      const lineErrors = this.validateInvoiceLine(line, index);
      errors.push(...lineErrors);
    });

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Valida una línea de factura individual
   * @param line - Línea a validar
   * @param lineIndex - Índice de la línea (para mensajes de error)
   * @returns Array de errores encontrados
   */
  static validateInvoiceLine(line: InvoiceLine, lineIndex: number): ValidationError[] {
    const errors: ValidationError[] = [];
    const prefix = `lines[${lineIndex}]`;

    // Validar descripción
    if (!line.description || line.description.trim() === '') {
      errors.push({
        field: `${prefix}.description`,
        message: `La línea ${lineIndex + 1} debe tener descripción`,
        code: 'LINE_DESCRIPTION_REQUIRED',
      });
    }

    // Validar cantidad
    if (line.quantity <= 0) {
      errors.push({
        field: `${prefix}.quantity`,
        message: `La cantidad en línea ${lineIndex + 1} debe ser mayor que 0`,
        code: 'INVALID_QUANTITY',
      });
    }

    // Validar precio unitario
    if (line.unitPrice < 0) {
      errors.push({
        field: `${prefix}.unitPrice`,
        message: `El precio unitario en línea ${lineIndex + 1} no puede ser negativo`,
        code: 'INVALID_UNIT_PRICE',
      });
    }

    // Validar descuento
    if (line.discountPercentage < 0 || line.discountPercentage > this.MAX_DISCOUNT) {
      errors.push({
        field: `${prefix}.discountPercentage`,
        message: `El descuento en línea ${lineIndex + 1} debe estar entre 0 y ${this.MAX_DISCOUNT}`,
        code: 'INVALID_DISCOUNT',
      });
    }

    // Validar tasa de IVA
    if (!this.VALID_TAX_RATES.includes(line.taxRate)) {
      errors.push({
        field: `${prefix}.taxRate`,
        message: `La tasa de IVA en línea ${lineIndex + 1} debe ser 0%, 4%, 10% o 21%`,
        code: 'INVALID_TAX_RATE',
      });
    }

    // Validar cuenta contable si existe
    if (line.accountCode) {
      const validation = PGCValidator.validateAccountGroup(line.accountCode);
      if (!validation.valid) {
        errors.push({
          field: `${prefix}.accountCode`,
          message: `La cuenta contable "${line.accountCode}" en línea ${lineIndex + 1} no es válida según PGC`,
          code: 'INVALID_ACCOUNT_CODE',
        });
      }
    }

    return errors;
  }

  /**
   * Valida que una factura pueda cambiar de estado
   * @param currentStatus - Estado actual de aprobación
   * @param newStatus - Nuevo estado deseado
   * @returns Resultado de validación
   */
  static canChangeStatus(
    currentStatus: ApprovalStatus,
    newStatus: ApprovalStatus
  ): ValidationResult {
    const errors: ValidationError[] = [];

    const validTransitions: Record<ApprovalStatus, ApprovalStatus[]> = {
      pending_manager: ['pending_accounting', 'approved', 'rejected'],
      pending_accounting: ['approved', 'rejected'],
      approved: [], // No se puede cambiar desde aprobado
      rejected: [], // No se puede cambiar desde rechazado
    };

    const allowedStatuses = validTransitions[currentStatus] || [];

    if (!allowedStatuses.includes(newStatus)) {
      errors.push({
        field: 'approvalStatus',
        message: `No se puede cambiar de ${currentStatus} a ${newStatus}`,
        code: 'INVALID_STATUS_TRANSITION',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Valida que una factura pueda ser aprobada
   * @param invoice - Factura a validar
   * @returns Resultado de validación
   */
  static canApprove(invoice: InvoiceReceived): ValidationResult {
    const errors: ValidationError[] = [];

    if (invoice.approvalStatus === 'approved') {
      errors.push({
        field: 'approvalStatus',
        message: 'La factura ya está aprobada',
        code: 'ALREADY_APPROVED',
      });
    }

    if (invoice.approvalStatus === 'rejected') {
      errors.push({
        field: 'approvalStatus',
        message: 'La factura fue rechazada previamente',
        code: 'ALREADY_REJECTED',
      });
    }

    if (!invoice.supplierId) {
      errors.push({
        field: 'supplierId',
        message: 'La factura debe tener un proveedor asignado',
        code: 'SUPPLIER_REQUIRED',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Valida que una factura pueda ser rechazada
   */
  static canReject(invoice: InvoiceReceived): ValidationResult {
    const errors: ValidationError[] = [];

    if (invoice.approvalStatus === 'approved') {
      errors.push({
        field: 'approvalStatus',
        message: 'No se puede rechazar una factura ya aprobada',
        code: 'CANNOT_REJECT_APPROVED',
      });
    }

    if (invoice.approvalStatus === 'rejected') {
      errors.push({
        field: 'approvalStatus',
        message: 'La factura ya fue rechazada previamente',
        code: 'ALREADY_REJECTED',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
