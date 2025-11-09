// ============================================================================
// CASO DE USO - BULK REJECT INVOICES
// Orquesta: Validación → Validación de permisos → Rechazo masivo
// ============================================================================

import { InvoiceValidator } from '../services/InvoiceValidator';
import { ApprovalEngine } from '../services/ApprovalEngine';
import { IInvoiceRepository } from '../repositories/IInvoiceRepository';
import type { InvoiceReceived } from '../types';

export interface BulkRejectInvoicesInput {
  invoiceIds: string[];
  userId: string;
  userRole: 'admin' | 'manager' | 'accountant' | 'viewer';
  organizationId: string;
  reason: string;
  comments?: string;
}

export interface BulkRejectInvoicesOutput {
  success: number;
  failed: number;
  errors: Array<{ invoiceId: string; error: string }>;
}

/**
 * Caso de uso: Rechazo masivo de facturas
 * 
 * Flujo:
 * 1. Valida límite de operaciones masivas (máx 100 facturas)
 * 2. Valida que se proporcione una razón
 * 3. Valida permisos del usuario
 * 4. Ejecuta rechazo masivo con transacción
 * 5. Registra auditoría
 * 
 * @example
 * const useCase = new BulkRejectInvoicesUseCase(repository);
 * const result = await useCase.execute({
 *   invoiceIds: ['id1', 'id2'],
 *   userId: 'user-123',
 *   userRole: 'manager',
 *   organizationId: 'org-456',
 *   reason: 'Importes incorrectos'
 * });
 */
export class BulkRejectInvoicesUseCase {
  private readonly MAX_BULK_SIZE = 100;

  constructor(private repository: IInvoiceRepository) {}

  /**
   * Ejecuta el caso de uso de rechazo masivo de facturas
   */
  async execute(input: BulkRejectInvoicesInput): Promise<BulkRejectInvoicesOutput> {
    // PASO 1: Validar límite de operaciones masivas
    if (input.invoiceIds.length === 0) {
      throw new Error('Debe seleccionar al menos una factura');
    }

    if (input.invoiceIds.length > this.MAX_BULK_SIZE) {
      throw new Error(
        `Máximo ${this.MAX_BULK_SIZE} facturas por operación. Seleccionadas: ${input.invoiceIds.length}`
      );
    }

    // PASO 2: Validar que se proporcione una razón
    if (!input.reason || input.reason.trim() === '') {
      throw new Error('Debe proporcionar una razón para el rechazo masivo');
    }

    // PASO 3: Validar permisos básicos del usuario
    // En rechazo masivo, verificamos que no sea viewer
    if (input.userRole === 'viewer') {
      throw new Error('El usuario con rol "viewer" no tiene permisos para rechazar facturas');
    }

    // PASO 4: Ejecutar rechazo masivo (delegamos al repository para transaccionalidad)
    const result = await this.repository.bulkReject({
      invoiceIds: input.invoiceIds,
      userId: input.userId,
      userRole: input.userRole,
      organizationId: input.organizationId,
      reason: input.reason.trim(),
      comments: input.comments,
    });

    return result;
  }
}
