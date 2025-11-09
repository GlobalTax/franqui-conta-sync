// ============================================================================
// INVOICE REPOSITORY INTERFACE
// Define el contrato de persistencia para operaciones de facturación
// ============================================================================

import type { InvoiceReceived, InvoiceIssued, InvoiceFilters, InvoiceLine, PaginatedInvoices } from '../types';

export interface CreateInvoiceReceivedCommand {
  invoice: Omit<InvoiceReceived, 'id' | 'createdAt' | 'updatedAt'>;
  lines: Omit<InvoiceLine, 'id' | 'invoiceId'>[];
}

export interface CreateInvoiceIssuedCommand {
  invoice: Omit<InvoiceIssued, 'id' | 'createdAt' | 'updatedAt' | 'invoiceNumber' | 'fullInvoiceNumber'>;
  lines: Omit<InvoiceLine, 'id' | 'invoiceId'>[];
}

export interface UpdateInvoiceCommand {
  updates: Partial<InvoiceReceived> | Partial<InvoiceIssued>;
}

export interface ApproveInvoiceCommand {
  invoiceId: string;
  userId: string;
  comments?: string;
  centroCode?: string;
}

export interface RejectInvoiceCommand {
  invoiceId: string;
  userId: string;
  reason: string;
}

export interface BulkAssignCentreCommand {
  invoiceIds: string[];
  centroCode: string;
  userId: string;
  organizationId: string;
}

export interface BulkAssignCentreResult {
  success: number;
  failed: number;
  errors: Array<{ invoiceId: string; error: string }>;
}

export interface BulkApproveCommand {
  invoiceIds: string[];
  userId: string;
  userRole: 'admin' | 'manager' | 'accountant' | 'viewer';
  approvalLevel: 'manager' | 'accounting';
  organizationId: string;
  comments?: string;
}

export interface BulkRejectCommand {
  invoiceIds: string[];
  userId: string;
  userRole: 'admin' | 'manager' | 'accountant' | 'viewer';
  organizationId: string;
  reason: string;
  comments?: string;
}

export interface BulkOperationResult {
  success: number;
  failed: number;
  errors: Array<{ invoiceId: string; error: string }>;
}

/**
 * Repository Interface para operaciones de facturación
 * Separa la lógica de dominio de la implementación de persistencia
 */
export interface IInvoiceRepository {
  // ========== QUERIES (Read Operations) ==========
  
  /**
   * Encuentra una factura recibida por ID
   */
  findInvoiceReceivedById(id: string): Promise<InvoiceReceived | null>;
  
  /**
   * Busca facturas recibidas con filtros y paginación
   */
  findInvoicesReceived(filters: InvoiceFilters): Promise<PaginatedInvoices<InvoiceReceived>>;
  
  /**
   * Busca facturas emitidas con filtros
   */
  findInvoicesIssued(
    filters: Omit<InvoiceFilters, 'supplierId' | 'approvalStatus'>
  ): Promise<InvoiceIssued[]>;
  
  /**
   * Obtiene líneas de una factura
   */
  getInvoiceLines(
    invoiceId: string,
    invoiceType: 'received' | 'issued'
  ): Promise<InvoiceLine[]>;
  
  /**
   * Obtiene el siguiente número de factura
   */
  getNextInvoiceNumber(centroCode: string, series: string): Promise<number>;
  
  // ========== COMMANDS (Write Operations) ==========
  
  /**
   * Crea una factura recibida con líneas
   */
  createInvoiceReceived(command: CreateInvoiceReceivedCommand): Promise<InvoiceReceived>;
  
  /**
   * Crea una factura emitida con líneas
   */
  createInvoiceIssued(command: CreateInvoiceIssuedCommand): Promise<InvoiceIssued>;
  
  /**
   * Actualiza una factura recibida
   */
  updateInvoiceReceived(id: string, command: UpdateInvoiceCommand): Promise<InvoiceReceived>;
  
  /**
   * Actualiza una factura emitida
   */
  updateInvoiceIssued(id: string, command: UpdateInvoiceCommand): Promise<InvoiceIssued>;
  
  /**
   * Aprueba una factura recibida
   */
  approveInvoice(command: ApproveInvoiceCommand): Promise<void>;
  
  /**
   * Rechaza una factura recibida
   */
  rejectInvoice(command: RejectInvoiceCommand): Promise<void>;
  
  /**
   * Asigna centro a múltiples facturas de forma masiva
   */
  bulkAssignCentre(command: BulkAssignCentreCommand): Promise<BulkAssignCentreResult>;
  
  /**
   * Aprueba múltiples facturas de forma masiva
   */
  bulkApprove(command: BulkApproveCommand): Promise<BulkOperationResult>;
  
  /**
   * Rechaza múltiples facturas de forma masiva
   */
  bulkReject(command: BulkRejectCommand): Promise<BulkOperationResult>;
}
