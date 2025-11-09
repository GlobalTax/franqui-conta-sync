// ============================================================================
// SERVICIO DE DOMINIO - APPROVAL ENGINE
// Responsabilidad: Lógica de aprobaciones de facturas según reglas de negocio
// ============================================================================

import type { InvoiceReceived, ApprovalStatus } from '../types';

export interface ApprovalRequirements {
  requiresManagerApproval: boolean;
  requiresAccountingApproval: boolean;
  nextApprovalLevel: 'manager' | 'accounting' | null;
}

export interface ApprovalRule {
  minAmount: number;
  maxAmount: number;
  requiresManager: boolean;
  requiresAccounting: boolean;
}

/**
 * Motor de aprobaciones para facturas recibidas
 * Determina qué aprobaciones requiere una factura según reglas configurables
 */
export class ApprovalEngine {
  /**
   * Reglas de aprobación por defecto según importe
   * Estas reglas pueden venir de base de datos en el futuro (tabla approval_rules)
   */
  private static readonly DEFAULT_RULES: ApprovalRule[] = [
    {
      minAmount: 0,
      maxAmount: 500,
      requiresManager: false,
      requiresAccounting: true,
    },
    {
      minAmount: 500.01,
      maxAmount: 2000,
      requiresManager: true,
      requiresAccounting: true,
    },
    {
      minAmount: 2000.01,
      maxAmount: Infinity,
      requiresManager: true,
      requiresAccounting: true,
    },
  ];

  /**
   * Determina qué aprobaciones requiere una factura según su importe
   * @param totalAmount - Importe total de la factura
   * @param rules - Reglas personalizadas (opcional, usa DEFAULT_RULES por defecto)
   * @returns Requerimientos de aprobación calculados
   * 
   * @example
   * const reqs = ApprovalEngine.determineApprovalRequirements(450);
   * // { requiresManagerApproval: false, requiresAccountingApproval: true, nextApprovalLevel: 'accounting' }
   * 
   * const reqs2 = ApprovalEngine.determineApprovalRequirements(2500);
   * // { requiresManagerApproval: true, requiresAccountingApproval: true, nextApprovalLevel: 'manager' }
   */
  static determineApprovalRequirements(
    totalAmount: number,
    rules?: ApprovalRule[]
  ): ApprovalRequirements {
    const applicableRules = rules || this.DEFAULT_RULES;

    // Buscar la regla aplicable según el importe
    const rule = applicableRules.find(
      (r) => totalAmount >= r.minAmount && totalAmount <= r.maxAmount
    );

    if (!rule) {
      // Por defecto, si no hay regla aplicable, requiere aprobación contable
      return {
        requiresManagerApproval: false,
        requiresAccountingApproval: true,
        nextApprovalLevel: 'accounting',
      };
    }

    // Determinar siguiente nivel de aprobación
    // Si requiere manager, ese es el primer paso
    // Si solo requiere contabilidad, va directamente ahí
    let nextLevel: 'manager' | 'accounting' | null = null;
    if (rule.requiresManager) {
      nextLevel = 'manager';
    } else if (rule.requiresAccounting) {
      nextLevel = 'accounting';
    }

    return {
      requiresManagerApproval: rule.requiresManager,
      requiresAccountingApproval: rule.requiresAccounting,
      nextApprovalLevel: nextLevel,
    };
  }

  /**
   * Determina el siguiente estado de aprobación tras una acción de aprobación/rechazo
   * @param invoice - Factura actual
   * @param approvalLevel - Nivel que está aprobando (manager o accounting)
   * @param action - Acción realizada (approved o rejected)
   * @returns Nuevo estado de aprobación
   * 
   * @example
   * // Manager aprueba una factura que también requiere contabilidad
   * const status = ApprovalEngine.determineNextApprovalStatus(
   *   invoice, 
   *   'manager', 
   *   'approved'
   * );
   * // status === 'pending_accounting'
   */
  static determineNextApprovalStatus(
    invoice: InvoiceReceived,
    approvalLevel: 'manager' | 'accounting',
    action: 'approved' | 'rejected'
  ): ApprovalStatus {
    // Si se rechaza, el estado final es 'rejected' siempre
    if (action === 'rejected') {
      return 'rejected';
    }

    // Si aprobó el manager y también requiere contabilidad, pasar a pending_accounting
    if (approvalLevel === 'manager' && invoice.requiresAccountingApproval) {
      return 'pending_accounting';
    }

    // Si aprobó contabilidad, o si solo requería manager, la factura está aprobada
    if (approvalLevel === 'accounting' || !invoice.requiresAccountingApproval) {
      return 'approved';
    }

    // Por defecto, aprobada
    return 'approved';
  }

  /**
   * Valida si un usuario tiene permisos para aprobar en un nivel específico
   * @param userRole - Rol del usuario (admin, manager, accountant, viewer)
   * @param approvalLevel - Nivel de aprobación requerido
   * @returns true si el usuario puede aprobar en ese nivel
   * 
   * @example
   * const canApprove = ApprovalEngine.canUserApprove('manager', 'manager');
   * // canApprove === true
   * 
   * const canApprove2 = ApprovalEngine.canUserApprove('manager', 'accounting');
   * // canApprove2 === false (manager no puede aprobar nivel contable)
   */
  static canUserApprove(
    userRole: string,
    approvalLevel: 'manager' | 'accounting'
  ): boolean {
    const permissions: Record<string, string[]> = {
      admin: ['manager', 'accounting'], // Admin puede aprobar en cualquier nivel
      manager: ['manager'], // Manager solo puede aprobar nivel manager
      accountant: ['accounting'], // Contable solo puede aprobar nivel contable
      viewer: [], // Viewer no puede aprobar nada
    };

    return permissions[userRole]?.includes(approvalLevel) || false;
  }

  /**
   * Determina el nivel de aprobación pendiente actual de una factura
   * @param invoice - Factura a analizar
   * @returns Nivel de aprobación pendiente o null si no hay
   * 
   * @example
   * const level = ApprovalEngine.getPendingApprovalLevel(invoice);
   * // level === 'manager' (si approvalStatus === 'pending_manager')
   */
  static getPendingApprovalLevel(
    invoice: InvoiceReceived
  ): 'manager' | 'accounting' | null {
    if (invoice.approvalStatus === 'pending_manager') {
      return 'manager';
    }
    if (invoice.approvalStatus === 'pending_accounting') {
      return 'accounting';
    }
    return null;
  }

  /**
   * Verifica si una factura está completamente aprobada
   */
  static isFullyApproved(invoice: InvoiceReceived): boolean {
    return invoice.approvalStatus === 'approved';
  }

  /**
   * Verifica si una factura está en proceso de aprobación
   */
  static isPendingApproval(invoice: InvoiceReceived): boolean {
    return (
      invoice.approvalStatus === 'pending_manager' ||
      invoice.approvalStatus === 'pending_accounting'
    );
  }
}
