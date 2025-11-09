// ============================================================================
// CASO DE USO - REJECT INVOICE
// Orquesta: Validación → Actualización de estado → Registro de rechazo
// ============================================================================

import { InvoiceValidator } from '../services/InvoiceValidator';
import { ApprovalEngine } from '../services/ApprovalEngine';
import { InvoiceCommands } from '@/infrastructure/persistence/supabase/commands/InvoiceCommands';
import type { InvoiceReceived } from '../types';

export interface RejectInvoiceInput {
  invoice: InvoiceReceived;
  rejectorUserId: string;
  rejectorRole: 'admin' | 'manager' | 'accountant' | 'viewer';
  reason: string;
  comments?: string;
}

export interface RejectInvoiceOutput {
  updatedInvoice: InvoiceReceived;
}

/**
 * Caso de uso: Rechazar Factura
 * 
 * Flujo:
 * 1. Valida que se proporcione una razón
 * 2. Valida que la factura pueda ser rechazada
 * 3. Actualiza estado de factura a 'rejected'
 * 4. Registra información de rechazo (usuario, fecha, razón)
 * 
 * @example
 * const useCase = new RejectInvoiceUseCase();
 * const result = await useCase.execute({
 *   invoice: existingInvoice,
 *   rejectorUserId: 'user-123',
 *   rejectorRole: 'manager',
 *   reason: 'Importe no coincide con pedido',
 *   comments: 'Revisar con proveedor'
 * });
 */
export class RejectInvoiceUseCase {
  /**
   * Ejecuta el caso de uso de rechazo de factura
   */
  async execute(input: RejectInvoiceInput): Promise<RejectInvoiceOutput> {
    // PASO 1: Validar que se proporcione una razón obligatoria
    if (!input.reason || input.reason.trim() === '') {
      throw new Error('Debe proporcionar una razón para el rechazo');
    }

    // PASO 2: Validar que la factura no esté ya rechazada o aprobada
    const validation = InvoiceValidator.canReject(input.invoice);

    if (!validation.isValid) {
      const errorMessages = validation.errors.map((e) => e.message).join(', ');
      throw new Error(`No se puede rechazar la factura: ${errorMessages}`);
    }

    // PASO 3: Validar permisos del usuario (debe poder aprobar para poder rechazar)
    const currentPendingLevel = ApprovalEngine.getPendingApprovalLevel(input.invoice);
    
    if (currentPendingLevel && !ApprovalEngine.canUserApprove(input.rejectorRole, currentPendingLevel)) {
      throw new Error(
        `El usuario con rol "${input.rejectorRole}" no tiene permisos para rechazar en nivel ${currentPendingLevel}`
      );
    }

    // PASO 4: Actualizar factura con datos de rechazo
    const updatedInvoice = await InvoiceCommands.updateInvoiceReceived(input.invoice.id, {
      updates: {
        approvalStatus: 'rejected',
        status: 'rejected',
        rejectedBy: input.rejectorUserId,
        rejectedAt: new Date().toISOString(),
        rejectedReason: input.reason,
        notes: input.comments
          ? `${input.invoice.notes || ''}\n\n[Rechazada] ${input.comments}`.trim()
          : input.invoice.notes,
      } as any,
    });

    // PASO 5: Registrar rechazo en historial (tabla invoice_approvals)
    // TODO: Implementar cuando se cree ApprovalHistoryQueries
    // await ApprovalHistoryQueries.createApproval({
    //   invoiceId: input.invoice.id,
    //   approverId: input.rejectorUserId,
    //   approvalLevel: currentPendingLevel || 'accounting',
    //   action: 'rejected',
    //   comments: input.reason,
    // });

    return {
      updatedInvoice,
    };
  }
}
