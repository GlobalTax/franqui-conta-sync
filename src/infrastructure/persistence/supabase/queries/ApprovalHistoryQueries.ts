// ============================================================================
// APPROVAL HISTORY QUERIES - Persistencia del historial de aprobaciones
// ============================================================================

import { supabase } from "@/integrations/supabase/client";
import { logger } from '@/lib/logger';
import type { InvoiceApproval } from "@/domain/invoicing/types";

export interface CreateApprovalRecord {
  invoiceId: string;
  approverId: string;
  approvalLevel: 'manager' | 'accounting' | 'admin';
  action: 'approved' | 'rejected';
  comments?: string;
}

export class ApprovalHistoryQueries {
  /**
   * Registra una acción de aprobación/rechazo en el historial
   */
  static async createApproval(record: CreateApprovalRecord): Promise<void> {
    const { error } = await supabase.from("invoice_approvals").insert({
      invoice_id: record.invoiceId,
      approver_id: record.approverId,
      approval_level: record.approvalLevel,
      action: record.action,
      comments: record.comments || null,
      created_at: new Date().toISOString(),
    } as any);

    if (error) {
      logger.error('ApprovalHistoryQueries', 'Error recording approval history', error);
      throw new Error(`Error registrando historial de aprobación: ${error.message}`);
    }
  }

  /**
   * Obtiene el historial de aprobaciones de una factura
   */
  static async getApprovalHistory(invoiceId: string): Promise<InvoiceApproval[]> {
    const { data, error } = await supabase
      .from("invoice_approvals")
      .select("*")
      .eq("invoice_id", invoiceId)
      .order("created_at", { ascending: true });

    if (error) {
      throw new Error(`Error fetching approval history: ${error.message}`);
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      invoiceId: row.invoice_id,
      approverId: row.approver_id,
      approvalLevel: row.approval_level,
      action: row.action,
      comments: row.comments,
      createdAt: row.created_at,
    }));
  }
}
