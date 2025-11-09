// ============================================================================
// CASO DE USO - CREATE INVOICE RECEIVED
// Orquesta: Validación → Cálculo → Determinación de Aprobaciones → Persistencia
// ============================================================================

import { InvoiceCalculator } from '../services/InvoiceCalculator';
import { InvoiceValidator } from '../services/InvoiceValidator';
import { ApprovalEngine } from '../services/ApprovalEngine';
import * as InvoiceQueries from '@/infrastructure/persistence/supabase/queries/InvoiceQueries';
import type { InvoiceReceived, InvoiceLine } from '../types';

export interface CreateInvoiceReceivedInput {
  supplierId: string;
  centroCode: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string;
  notes?: string;
  lines: Omit<InvoiceLine, 'id' | 'invoiceId' | 'invoiceType'>[];
  createdBy?: string;
}

export interface CreateInvoiceReceivedOutput {
  invoice: InvoiceReceived;
  validationWarnings?: string[];
}

/**
 * Caso de uso: Crear Factura Recibida
 * 
 * Flujo:
 * 1. Calcula totales usando InvoiceCalculator
 * 2. Construye objeto de factura con totales
 * 3. Valida reglas de negocio con InvoiceValidator
 * 4. Determina aprobaciones requeridas con ApprovalEngine
 * 5. Persiste en base de datos vía InvoiceQueries
 * 
 * @example
 * const useCase = new CreateInvoiceReceivedUseCase();
 * const result = await useCase.execute({
 *   supplierId: 'uuid-123',
 *   centroCode: 'C001',
 *   invoiceNumber: 'F2025-001',
 *   invoiceDate: '2025-01-15',
 *   lines: [
 *     { description: 'Producto 1', quantity: 2, unitPrice: 50, discountPercentage: 0, taxRate: 21, ... }
 *   ]
 * });
 */
export class CreateInvoiceReceivedUseCase {
  /**
   * Ejecuta el caso de uso de creación de factura recibida
   */
  async execute(input: CreateInvoiceReceivedInput): Promise<CreateInvoiceReceivedOutput> {
    // PASO 1: Calcular totales de la factura
    const totals = InvoiceCalculator.calculateInvoiceTotals(input.lines);

    // PASO 2: Construir objeto de factura con totales calculados
    const invoice: Omit<InvoiceReceived, 'id' | 'createdAt' | 'updatedAt'> = {
      supplierId: input.supplierId,
      centroCode: input.centroCode,
      invoiceNumber: input.invoiceNumber,
      invoiceDate: input.invoiceDate,
      dueDate: input.dueDate || null,
      subtotal: InvoiceCalculator.roundAmount(totals.subtotal),
      taxTotal: InvoiceCalculator.roundAmount(totals.totalTax),
      total: InvoiceCalculator.roundAmount(totals.total),
      status: 'pending',
      notes: input.notes || null,
      documentPath: null,
      entryId: null,
      paymentTransactionId: null,
      ocrConfidence: null,
      approvalStatus: 'pending_manager', // Se ajustará según reglas
      requiresManagerApproval: false,
      requiresAccountingApproval: false,
      rejectedBy: null,
      rejectedAt: null,
      rejectedReason: null,
      createdBy: input.createdBy || null,
    };

    // PASO 3: Validar reglas de negocio
    const validation = InvoiceValidator.validateInvoiceReceived(
      invoice,
      input.lines as InvoiceLine[]
    );

    if (!validation.isValid) {
      const errorMessages = validation.errors.map((e) => e.message).join(', ');
      throw new Error(`Validación fallida: ${errorMessages}`);
    }

    // PASO 4: Determinar aprobaciones requeridas según importe
    const approvalReqs = ApprovalEngine.determineApprovalRequirements(invoice.total);

    invoice.requiresManagerApproval = approvalReqs.requiresManagerApproval;
    invoice.requiresAccountingApproval = approvalReqs.requiresAccountingApproval;

    // Establecer estado inicial de aprobación
    if (approvalReqs.nextApprovalLevel === 'manager') {
      invoice.approvalStatus = 'pending_manager';
    } else if (approvalReqs.nextApprovalLevel === 'accounting') {
      invoice.approvalStatus = 'pending_accounting';
    } else {
      // Si no requiere aprobaciones, aprobar automáticamente
      invoice.approvalStatus = 'approved';
      invoice.status = 'approved';
    }

    // PASO 5: Persistir en base de datos
    const createdInvoice = await InvoiceQueries.createInvoiceReceived(
      invoice,
      input.lines
    );

    return {
      invoice: createdInvoice,
      validationWarnings: [],
    };
  }
}
