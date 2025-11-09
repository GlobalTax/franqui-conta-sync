// ============================================================================
// CASO DE USO - APPROVE INVOICE
// Orquesta: Validación de permisos → Validación de estado → Actualización
// ============================================================================

import { InvoiceValidator } from '../services/InvoiceValidator';
import { ApprovalEngine } from '../services/ApprovalEngine';
import * as InvoiceQueries from '@/infrastructure/persistence/supabase/queries/InvoiceQueries';
import type { InvoiceReceived, ApprovalStatus } from '../types';

export interface ApproveInvoiceInput {
  invoice: InvoiceReceived;
  approverUserId: string;
  approverRole: 'admin' | 'manager' | 'accountant' | 'viewer';
  approvalLevel: 'manager' | 'accounting';
  comments?: string;
}

export interface ApproveInvoiceOutput {
  updatedInvoice: InvoiceReceived;
  nextApprovalStatus: ApprovalStatus;
}

/**
 * Caso de uso: Aprobar Factura
 * 
 * Flujo:
 * 1. Valida permisos del usuario con ApprovalEngine
 * 2. Valida que la factura pueda ser aprobada con InvoiceValidator
 * 3. Determina siguiente estado con ApprovalEngine
 * 4. Actualiza factura en base de datos
 * 
 * @example
 * const useCase = new ApproveInvoiceUseCase();
 * const result = await useCase.execute({
 *   invoice: existingInvoice,
 *   approverUserId: 'user-123',
 *   approverRole: 'manager',
 *   approvalLevel: 'manager',
 *   comments: 'Aprobado según presupuesto'
 * });
 */
export class ApproveInvoiceUseCase {
  /**
   * Ejecuta el caso de uso de aprobación de factura
   */
  async execute(input: ApproveInvoiceInput): Promise<ApproveInvoiceOutput> {
    // PASO 1: Validar que el usuario tiene permisos para aprobar en este nivel
    if (!ApprovalEngine.canUserApprove(input.approverRole, input.approvalLevel)) {
      throw new Error(
        `El usuario con rol "${input.approverRole}" no tiene permisos para aprobar a nivel ${input.approvalLevel}`
      );
    }

    // PASO 2: Validar que la factura puede ser aprobada
    const validation = InvoiceValidator.canApprove(input.invoice);

    if (!validation.isValid) {
      const errorMessages = validation.errors.map((e) => e.message).join(', ');
      throw new Error(`No se puede aprobar la factura: ${errorMessages}`);
    }

    // PASO 3: Validar que el nivel de aprobación coincide con el estado actual
    const currentPendingLevel = ApprovalEngine.getPendingApprovalLevel(input.invoice);
    
    if (currentPendingLevel && currentPendingLevel !== input.approvalLevel) {
      throw new Error(
        `La factura está pendiente de aprobación de nivel "${currentPendingLevel}", no "${input.approvalLevel}"`
      );
    }

    // PASO 4: Determinar siguiente estado
    const nextStatus = ApprovalEngine.determineNextApprovalStatus(
      input.invoice,
      input.approvalLevel,
      'approved'
    );

    // PASO 5: Actualizar factura en base de datos
    const updatedInvoice = await InvoiceQueries.updateInvoiceReceived(input.invoice.id, {
      approvalStatus: nextStatus,
      status: nextStatus === 'approved' ? 'approved' : 'pending',
    });

    // PASO 6: Registrar aprobación en historial (tabla invoice_approvals)
    // TODO: Implementar cuando se cree ApprovalHistoryQueries
    // await ApprovalHistoryQueries.createApproval({
    //   invoiceId: input.invoice.id,
    //   approverId: input.approverUserId,
    //   approvalLevel: input.approvalLevel,
    //   action: 'approved',
    //   comments: input.comments,
    // });

    return {
      updatedInvoice,
      nextApprovalStatus: nextStatus,
    };
  }
}
