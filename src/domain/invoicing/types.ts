// ============================================================================
// TIPOS DE DOMINIO - FACTURACIÓN
// Tipos para facturas recibidas y emitidas independientes de infraestructura
// ============================================================================

/**
 * Factura Recibida (de proveedores)
 */
export interface InvoiceReceived {
  id: string;
  supplierId: string | null;
  centroCode: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string | null;
  subtotal: number;
  taxTotal: number;
  total: number;
  status: InvoiceStatus;
  documentPath: string | null;
  entryId: string | null;
  paymentTransactionId: string | null;
  ocrConfidence: number | null;
  notes: string | null;
  approvalStatus: ApprovalStatus;
  requiresManagerApproval: boolean;
  requiresAccountingApproval: boolean;
  rejectedBy: string | null;
  rejectedAt: string | null;
  rejectedReason: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  // Relaciones
  supplier?: SupplierInfo;
  lines?: InvoiceLine[];
  approvals?: InvoiceApproval[];
}

/**
 * Factura Emitida (a clientes)
 */
export interface InvoiceIssued {
  id: string;
  centroCode: string;
  customerName: string;
  customerTaxId: string | null;
  customerEmail: string | null;
  customerAddress: string | null;
  invoiceSeries: string;
  invoiceNumber: number;
  fullInvoiceNumber: string;
  invoiceDate: string;
  dueDate: string | null;
  subtotal: number;
  taxTotal: number;
  total: number;
  status: InvoiceStatus;
  entryId: string | null;
  paymentTransactionId: string | null;
  pdfPath: string | null;
  sentAt: string | null;
  paidAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  // Relaciones
  lines?: InvoiceLine[];
}

/**
 * Línea de factura (común para received/issued)
 */
export interface InvoiceLine {
  id: string;
  invoiceId: string;
  invoiceType: 'received' | 'issued';
  lineNumber: number;
  description: string;
  quantity: number;
  unitPrice: number;
  discountPercentage: number;
  discountAmount: number;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  accountCode: string | null;
}

/**
 * Aprobación de factura
 */
export interface InvoiceApproval {
  id: string;
  invoiceId: string;
  approverId: string;
  approvalLevel: 'manager' | 'accounting' | 'admin';
  action: 'approved' | 'rejected';
  comments: string | null;
  createdAt: string;
}

/**
 * Información básica de proveedor (para joins)
 */
export interface SupplierInfo {
  id: string;
  name: string;
  taxId: string;
}

/**
 * Estados de factura
 */
export type InvoiceStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'paid' | 'cancelled';

/**
 * Estados de aprobación
 */
export type ApprovalStatus = 'pending_manager' | 'pending_accounting' | 'approved' | 'rejected';

/**
 * Filtros para consulta de facturas
 */
export interface InvoiceFilters {
  centroCode?: string;
  supplierId?: string;
  status?: InvoiceStatus;
  approvalStatus?: ApprovalStatus;
  dateFrom?: string;
  dateTo?: string;
  minAmount?: number;
  maxAmount?: number;
  searchTerm?: string;
}
