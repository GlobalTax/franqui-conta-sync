import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { InvoiceQueries } from '@/infrastructure/persistence/supabase/queries/InvoiceQueries';
import { ApproveInvoiceUseCase } from '@/domain/invoicing/use-cases/ApproveInvoice';
import { RejectInvoiceUseCase } from '@/domain/invoicing/use-cases/RejectInvoice';
import { toast } from 'sonner';
import type { InvoiceReceived } from '@/domain/invoicing/types';

export interface InvoiceApproval {
  id: string;
  invoice_id: string;
  approver_id: string;
  approval_level: 'manager' | 'accounting';
  action: 'approved' | 'rejected' | 'requested_changes';
  comments: string | null;
  created_at: string;
}

export interface ApprovalAction {
  invoice_id: string;
  approval_level: 'manager' | 'accounting';
  action: 'approved' | 'rejected' | 'requested_changes';
  comments?: string;
}

export function useInvoiceApprovals(invoiceId?: string) {
  return useQuery({
    queryKey: ['invoice-approvals', invoiceId],
    queryFn: async () => {
      const query = supabase
        .from('invoice_approvals')
        .select('*')
        .order('created_at', { ascending: false });

      if (invoiceId) {
        query.eq('invoice_id', invoiceId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as InvoiceApproval[];
    },
    enabled: !!invoiceId,
  });
}

/**
 * Hook para aprobar facturas usando el caso de uso ApproveInvoice
 * Delega la lógica de permisos y estado al caso de uso
 */
export function useApproveInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: ApprovalAction) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('User not authenticated');

      // Obtener rol del usuario (simplificado, idealmente desde user_metadata o tabla de permisos)
      const userRole = (userData.user.user_metadata?.role as 'admin' | 'manager' | 'accountant') || 'accountant';

      // Obtener factura completa
      const invoice = await InvoiceQueries.findInvoiceReceivedById(params.invoice_id);
      if (!invoice) throw new Error('Factura no encontrada');

      if (params.action === 'approved') {
        // Usar caso de uso de aprobación
        const useCase = new ApproveInvoiceUseCase();
        const result = await useCase.execute({
          invoice,
          approverUserId: userData.user.id,
          approverRole: userRole,
          approvalLevel: params.approval_level,
          comments: params.comments,
        });

        return result.updatedInvoice;
      } else if (params.action === 'rejected') {
        // Usar caso de uso de rechazo
        const useCase = new RejectInvoiceUseCase();
        const result = await useCase.execute({
          invoice,
          rejectorUserId: userData.user.id,
          rejectorRole: userRole,
          reason: params.comments || 'Sin razón especificada',
          comments: params.comments,
        });

        return result.updatedInvoice;
      } else {
        // Para 'requested_changes', mantener lógica anterior (insertar en invoice_approvals)
        const { data, error } = await supabase
          .from('invoice_approvals')
          .insert({
            invoice_id: params.invoice_id,
            approver_id: userData.user.id,
            approval_level: params.approval_level,
            action: params.action,
            comments: params.comments,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['invoices_received'] });
      queryClient.invalidateQueries({ queryKey: ['invoice-approvals', variables.invoice_id] });
      queryClient.invalidateQueries({ queryKey: ['pending-tasks'] });

      const actionText =
        variables.action === 'approved'
          ? 'aprobada'
          : variables.action === 'rejected'
          ? 'rechazada'
          : 'marcada para revisión';
      toast.success(`Factura ${actionText} correctamente`);
    },
    onError: (error: Error) => {
      toast.error(`Error al procesar aprobación: ${error.message}`);
    },
  });
}

export function useSubmitForApproval() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invoiceId: string) => {
      // Get invoice details
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices_received')
        .select('total, centro_code')
        .eq('id', invoiceId)
        .single();

      if (invoiceError) throw invoiceError;

      // Calculate required approvals
      const { data: rules, error: rulesError } = await supabase
        .rpc('calculate_required_approvals', {
          p_centro_code: invoice.centro_code,
          p_total_amount: invoice.total,
        });

      if (rulesError) throw rulesError;

      const rule = rules?.[0];
      const requiresManager = rule?.requires_manager || false;
      const requiresAccounting = rule?.requires_accounting || true;

      // Update invoice status
      const { error: updateError } = await supabase
        .from('invoices_received')
        .update({
          approval_status: 'pending_approval',
          requires_manager_approval: requiresManager,
          requires_accounting_approval: requiresAccounting,
        })
        .eq('id', invoiceId);

      if (updateError) throw updateError;

      return { invoiceId, requiresManager, requiresAccounting };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices_received'] });
      queryClient.invalidateQueries({ queryKey: ['pending-tasks'] });
      toast.success('Factura enviada para aprobación');
    },
    onError: (error: Error) => {
      toast.error(`Error al enviar factura: ${error.message}`);
    },
  });
}
