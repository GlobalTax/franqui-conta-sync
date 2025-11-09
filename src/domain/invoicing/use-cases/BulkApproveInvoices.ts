// ============================================================================
// CASO DE USO - BULK APPROVE INVOICES
// Orquesta: Validación de límites → Validación de permisos → Aprobación masiva
// ============================================================================

import { InvoiceValidator } from '../services/InvoiceValidator';
import { ApprovalEngine } from '../services/ApprovalEngine';
import { IInvoiceRepository } from '../repositories/IInvoiceRepository';
import type { InvoiceReceived } from '../types';

export interface BulkApproveInvoicesInput {
  invoiceIds: string[];
  userId: string;
  userRole: 'admin' | 'manager' | 'accountant' | 'viewer';
  approvalLevel: 'manager' | 'accounting';
  organizationId: string;
  comments?: string;
}

export interface BulkApproveInvoicesOutput {
  success: number;
  failed: number;
  errors: Array<{ invoiceId: string; error: string }>;
}

/**
 * Caso de uso: Aprobación masiva de facturas
 * 
 * Flujo:
 * 1. Valida límite de operaciones masivas (máx 100 facturas)
 * 2. Valida permisos del usuario para aprobar
 * 3. Obtiene facturas y valida que cada una puede ser aprobada
 * 4. Ejecuta aprobación masiva con transacción
 * 5. Registra auditoría
 * 
 * @example
 * const useCase = new BulkApproveInvoicesUseCase(repository);
 * const result = await useCase.execute({
 *   invoiceIds: ['id1', 'id2'],
 *   userId: 'user-123',
 *   userRole: 'manager',
 *   approvalLevel: 'manager',
 *   organizationId: 'org-456'
 * });
 */
export class BulkApproveInvoicesUseCase {
  private readonly MAX_BULK_SIZE = 100;

  constructor(private repository: IInvoiceRepository) {}

  /**
   * Ejecuta el caso de uso de aprobación masiva de facturas
   */
  async execute(input: BulkApproveInvoicesInput): Promise<BulkApproveInvoicesOutput> {
    // PASO 1: Validar límite de operaciones masivas
    if (input.invoiceIds.length === 0) {
      throw new Error('Debe seleccionar al menos una factura');
    }

    if (input.invoiceIds.length > this.MAX_BULK_SIZE) {
      throw new Error(
        `Máximo ${this.MAX_BULK_SIZE} facturas por operación. Seleccionadas: ${input.invoiceIds.length}`
      );
    }

    // PASO 2: Validar permisos del usuario
    if (!ApprovalEngine.canUserApprove(input.userRole, input.approvalLevel)) {
      throw new Error(
        `El usuario con rol "${input.userRole}" no tiene permisos para aprobar a nivel ${input.approvalLevel}`
      );
    }

    // PASO 3: Ejecutar aprobación masiva (delegamos al repository para transaccionalidad)
    const result = await this.repository.bulkApprove({
      invoiceIds: input.invoiceIds,
      userId: input.userId,
      userRole: input.userRole,
      approvalLevel: input.approvalLevel,
      organizationId: input.organizationId,
      comments: input.comments,
    });

    return result;
  }
}
