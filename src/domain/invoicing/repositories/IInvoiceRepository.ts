// ============================================================================
// INVOICE REPOSITORY INTERFACE
// Define el contrato de persistencia para operaciones de facturación
// ============================================================================

import type { InvoiceReceived, InvoiceIssued, InvoiceFilters, InvoiceLine } from '../types';

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
   * Busca facturas recibidas con filtros
   */
  findInvoicesReceived(filters: InvoiceFilters): Promise<InvoiceReceived[]>;
  
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
}
