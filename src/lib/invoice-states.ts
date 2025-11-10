import { 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  AlertTriangle,
  FileCheck,
  Ban
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/**
 * Sistema centralizado de estados de facturas
 * Sigue nomenclatura PGC + Quantum Economics
 */

export type InvoiceStatus = 
  | 'draft'
  | 'pending_approval'
  | 'processing'
  | 'needs_review'
  | 'processed_ok'
  | 'approved_manager'
  | 'approved_accounting'
  | 'posted'
  | 'rejected'
  | 'error_ocr';

export interface InvoiceStateConfig {
  label: string;
  color: 'gray' | 'yellow' | 'blue' | 'orange' | 'green' | 'red' | 'primary';
  bgColor: string;
  borderColor: string;
  textColor: string;
  darkBgColor: string;
  darkBorderColor: string;
  darkTextColor: string;
  icon: LucideIcon;
  description: string;
  allowActions: {
    approve?: boolean;
    reject?: boolean;
    retryOCR?: boolean;
    post?: boolean;
    edit?: boolean;
  };
}

export const INVOICE_STATES: Record<InvoiceStatus, InvoiceStateConfig> = {
  draft: {
    label: 'Borrador',
    color: 'gray',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-300',
    textColor: 'text-gray-700',
    darkBgColor: 'dark:bg-gray-950',
    darkBorderColor: 'dark:border-gray-700',
    darkTextColor: 'dark:text-gray-300',
    icon: Clock,
    description: 'Factura creada pero no procesada',
    allowActions: { edit: true, retryOCR: true }
  },
  
  pending_approval: {
    label: 'Pendiente',
    color: 'yellow',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-300',
    textColor: 'text-yellow-700',
    darkBgColor: 'dark:bg-yellow-950',
    darkBorderColor: 'dark:border-yellow-700',
    darkTextColor: 'dark:text-yellow-300',
    icon: AlertCircle,
    description: 'Esperando validación del gerente',
    allowActions: { approve: true, reject: true, retryOCR: true }
  },
  
  processing: {
    label: 'Procesando',
    color: 'blue',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-300',
    textColor: 'text-blue-700',
    darkBgColor: 'dark:bg-blue-950',
    darkBorderColor: 'dark:border-blue-700',
    darkTextColor: 'dark:text-blue-300',
    icon: Loader2,
    description: 'Extracción OCR en curso',
    allowActions: {}
  },
  
  needs_review: {
    label: 'Requiere Revisión',
    color: 'orange',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-300',
    textColor: 'text-orange-700',
    darkBgColor: 'dark:bg-orange-950',
    darkBorderColor: 'dark:border-orange-700',
    darkTextColor: 'dark:text-orange-300',
    icon: AlertTriangle,
    description: 'Confianza OCR < 70% o campos faltantes',
    allowActions: { edit: true, approve: true, reject: true, retryOCR: true }
  },
  
  processed_ok: {
    label: 'Procesado',
    color: 'green',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-300',
    textColor: 'text-green-700',
    darkBgColor: 'dark:bg-green-950',
    darkBorderColor: 'dark:border-green-700',
    darkTextColor: 'dark:text-green-300',
    icon: CheckCircle2,
    description: 'OCR completado con confianza > 70%',
    allowActions: { approve: true, reject: true, retryOCR: true }
  },
  
  approved_manager: {
    label: 'Apr. Gerente',
    color: 'blue',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-300',
    textColor: 'text-blue-700',
    darkBgColor: 'dark:bg-blue-950',
    darkBorderColor: 'dark:border-blue-700',
    darkTextColor: 'dark:text-blue-300',
    icon: CheckCircle2,
    description: 'Primera aprobación (gerente)',
    allowActions: { approve: true, reject: true }
  },
  
  approved_accounting: {
    label: 'Aprobado',
    color: 'green',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-300',
    textColor: 'text-green-700',
    darkBgColor: 'dark:bg-green-950',
    darkBorderColor: 'dark:border-green-700',
    darkTextColor: 'dark:text-green-300',
    icon: CheckCircle2,
    description: 'Listo para contabilizar',
    allowActions: { post: true, reject: true }
  },
  
  posted: {
    label: 'Contabilizado',
    color: 'primary',
    bgColor: 'bg-primary/10',
    borderColor: 'border-primary/20',
    textColor: 'text-primary',
    darkBgColor: 'dark:bg-primary/10',
    darkBorderColor: 'dark:border-primary/20',
    darkTextColor: 'dark:text-primary',
    icon: FileCheck,
    description: 'Asiento contable generado',
    allowActions: {}
  },
  
  rejected: {
    label: 'Rechazado',
    color: 'red',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-300',
    textColor: 'text-red-700',
    darkBgColor: 'dark:bg-red-950',
    darkBorderColor: 'dark:border-red-700',
    darkTextColor: 'dark:text-red-300',
    icon: XCircle,
    description: 'Factura rechazada por gerente/contable',
    allowActions: { retryOCR: true }
  },
  
  error_ocr: {
    label: 'Error OCR',
    color: 'red',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-300',
    textColor: 'text-red-700',
    darkBgColor: 'dark:bg-red-950',
    darkBorderColor: 'dark:border-red-700',
    darkTextColor: 'dark:text-red-300',
    icon: Ban,
    description: 'Fallo en procesamiento OCR',
    allowActions: { retryOCR: true, edit: true }
  }
};

/**
 * Determina el estado de una factura basado en sus propiedades
 */
export function getInvoiceState(invoice: {
  status?: string;
  ocr_engine?: string | null;
  ocr_confidence?: number | null;
  accounting_entry_id?: string | null;
  approval_status?: string;
}): InvoiceStatus {
  // Si está contabilizado, siempre es 'posted'
  if (invoice.accounting_entry_id) return 'posted';
  
  // Si tiene approval_status, usar ese primero
  if (invoice.approval_status) {
    if (invoice.approval_status === 'approved_accounting') return 'approved_accounting';
    if (invoice.approval_status === 'approved_manager') return 'approved_manager';
    if (invoice.approval_status === 'rejected') return 'rejected';
    if (invoice.approval_status === 'pending_approval') return 'pending_approval';
  }
  
  // Lógica basada en OCR
  if (!invoice.ocr_engine) return 'draft';
  if (invoice.ocr_confidence === null || invoice.ocr_confidence === undefined) return 'error_ocr';
  if (invoice.ocr_confidence < 0.7) return 'needs_review';
  
  // Si tiene status definido, usarlo
  if (invoice.status) {
    const s = invoice.status as InvoiceStatus;
    if (INVOICE_STATES[s]) return s;
  }
  
  return 'processed_ok';
}

/**
 * Verifica si una acción está permitida para un estado
 */
export function canPerformAction(
  status: InvoiceStatus, 
  action: keyof InvoiceStateConfig['allowActions']
): boolean {
  return INVOICE_STATES[status]?.allowActions[action] || false;
}

/**
 * Obtiene el className completo para un Badge (con dark mode)
 */
export function getStateClassName(status: InvoiceStatus): string {
  const config = INVOICE_STATES[status];
  if (!config) return '';
  
  return `${config.bgColor} ${config.borderColor} ${config.textColor} ${config.darkBgColor} ${config.darkBorderColor} ${config.darkTextColor}`;
}
