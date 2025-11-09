// ============================================================================
// INVOICE REPOSITORY IMPLEMENTATION (Supabase)
// Implementación concreta del patrón Repository para Invoicing
// ============================================================================

import { IInvoiceRepository } from '@/domain/invoicing/repositories/IInvoiceRepository';
import { InvoiceQueries } from '../queries/InvoiceQueries';
import { InvoiceCommands } from '../commands/InvoiceCommands';
import type { InvoiceReceived, InvoiceIssued, InvoiceFilters, InvoiceLine } from '@/domain/invoicing/types';
import type {
  CreateInvoiceReceivedCommand,
  CreateInvoiceIssuedCommand,
  UpdateInvoiceCommand,
  ApproveInvoiceCommand,
  RejectInvoiceCommand,
} from '@/domain/invoicing/repositories/IInvoiceRepository';

/**
 * Implementación concreta de IInvoiceRepository usando Supabase
 * Delega a InvoiceQueries (read) y InvoiceCommands (write)
 */
export class InvoiceRepositoryImpl implements IInvoiceRepository {
  // ========== QUERIES (Read Operations) ==========

  async findInvoiceReceivedById(id: string): Promise<InvoiceReceived | null> {
    return InvoiceQueries.findInvoiceReceivedById(id);
  }

  async findInvoicesReceived(filters: InvoiceFilters): Promise<InvoiceReceived[]> {
    return InvoiceQueries.findInvoicesReceived(filters);
  }

  async findInvoicesIssued(
    filters: Omit<InvoiceFilters, 'supplierId' | 'approvalStatus'>
  ): Promise<InvoiceIssued[]> {
    return InvoiceQueries.findInvoicesIssued(filters);
  }

  async getInvoiceLines(
    invoiceId: string,
    invoiceType: 'received' | 'issued'
  ): Promise<InvoiceLine[]> {
    return InvoiceQueries.getInvoiceLines(invoiceId, invoiceType);
  }

  async getNextInvoiceNumber(centroCode: string, series: string): Promise<number> {
    return InvoiceQueries.getNextInvoiceNumber(centroCode, series);
  }

  // ========== COMMANDS (Write Operations) ==========

  async createInvoiceReceived(command: CreateInvoiceReceivedCommand): Promise<InvoiceReceived> {
    return InvoiceCommands.createInvoiceReceived(command);
  }

  async createInvoiceIssued(command: CreateInvoiceIssuedCommand): Promise<InvoiceIssued> {
    return InvoiceCommands.createInvoiceIssued(command);
  }

  async updateInvoiceReceived(id: string, command: UpdateInvoiceCommand): Promise<InvoiceReceived> {
    return InvoiceCommands.updateInvoiceReceived(id, command);
  }

  async updateInvoiceIssued(id: string, command: UpdateInvoiceCommand): Promise<InvoiceIssued> {
    return InvoiceCommands.updateInvoiceIssued(id, command);
  }

  async approveInvoice(command: ApproveInvoiceCommand): Promise<void> {
    return InvoiceCommands.approveInvoice(command);
  }

  async rejectInvoice(command: RejectInvoiceCommand): Promise<void> {
    return InvoiceCommands.rejectInvoice(command);
  }

  async bulkAssignCentre(command: any): Promise<any> {
    return InvoiceCommands.bulkAssignCentre(command);
  }

  async bulkApprove(command: any): Promise<any> {
    return InvoiceCommands.bulkApprove(command);
  }

  async bulkReject(command: any): Promise<any> {
    return InvoiceCommands.bulkReject(command);
  }
}
