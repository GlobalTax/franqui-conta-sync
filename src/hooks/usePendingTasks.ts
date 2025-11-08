import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from './useOrganization';

export interface PendingTask {
  id: string;
  type: 'invoice_approval' | 'daily_closure' | 'bank_reconciliation';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  centro_code: string;
  centro_name?: string;
  amount?: number;
  due_date?: string;
  created_at: string;
  metadata: any;
}

export function usePendingTasks() {
  const { currentMembership } = useOrganization();

  return useQuery({
    queryKey: ['pending-tasks', currentMembership?.restaurant_id],
    queryFn: async () => {
      const tasks: PendingTask[] = [];

      // Get user's centres
      const { data: centres } = await supabase
        .from('v_user_centres')
        .select('centro_code')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id || '');

      if (!centres) return tasks;

      const centroCodes = centres.map(c => c.centro_code);

      // Get centre names from centres table
      const { data: centreDetails } = await supabase
        .from('centres')
        .select('codigo, nombre')
        .in('codigo', centroCodes);

      const centreMap = new Map(
        centreDetails?.map(c => [c.codigo, c.nombre]) || []
      );

      // 1. Pending invoice approvals
      const { data: pendingInvoices } = await supabase
        .from('invoices_received')
        .select(`
          id,
          invoice_number,
          total,
          invoice_date,
          centro_code,
          approval_status,
          requires_manager_approval,
          requires_accounting_approval,
          suppliers (nombre)
        `)
        .in('centro_code', centroCodes)
        .in('approval_status', ['pending_approval', 'approved_manager']);

      if (pendingInvoices) {
        for (const invoice of pendingInvoices) {
          const centroName = centreMap.get(invoice.centro_code);
          
          // Determine if current user should act on this
          let shouldShow = false;
          let level = '';
          
          if (invoice.approval_status === 'pending_approval' && invoice.requires_manager_approval) {
            shouldShow = true;
            level = 'gerente';
          } else if (invoice.approval_status === 'approved_manager' || 
                    (invoice.approval_status === 'pending_approval' && !invoice.requires_manager_approval)) {
            shouldShow = true;
            level = 'contabilidad';
          }

          if (shouldShow) {
            tasks.push({
              id: invoice.id,
              type: 'invoice_approval',
              title: `Aprobar Factura ${invoice.invoice_number}`,
              description: `${(invoice.suppliers as any)?.nombre || 'Proveedor'} - €${invoice.total}`,
              priority: invoice.total > 2000 ? 'high' : invoice.total > 500 ? 'medium' : 'low',
              centro_code: invoice.centro_code,
              centro_name: centroName,
              amount: invoice.total,
              due_date: invoice.invoice_date,
              created_at: invoice.invoice_date,
              metadata: { invoice, level },
            });
          }
        }
      }

      // 2. Pending daily closures
      const { data: pendingClosures } = await supabase
        .from('daily_closures')
        .select('id, closure_date, centro_code, status, total_sales')
        .in('centro_code', centroCodes)
        .eq('status', 'draft');

      if (pendingClosures) {
        for (const closure of pendingClosures) {
          const centroName = centreMap.get(closure.centro_code);
          tasks.push({
            id: closure.id,
            type: 'daily_closure',
            title: `Validar Cierre Diario`,
            description: `${centroName || closure.centro_code} - ${closure.closure_date}`,
            priority: 'medium',
            centro_code: closure.centro_code,
            centro_name: centroName,
            amount: closure.total_sales,
            created_at: closure.closure_date,
            metadata: { closure },
          });
        }
      }

      // 3. Unreconciled bank transactions
      const { data: unreconciledTxs } = await supabase
        .from('bank_transactions')
        .select(`
          id,
          transaction_date,
          description,
          amount,
          bank_accounts (centro_code, account_name)
        `)
        .eq('status', 'pending')
        .limit(10);

      if (unreconciledTxs) {
        for (const tx of unreconciledTxs) {
          const account = tx.bank_accounts as any;
          if (account && centroCodes.includes(account.centro_code)) {
            const centroName = centreMap.get(account.centro_code);
            tasks.push({
              id: tx.id,
              type: 'bank_reconciliation',
              title: `Conciliar Transacción Bancaria`,
              description: `${account.account_name} - ${tx.description}`,
              priority: Math.abs(tx.amount) > 1000 ? 'high' : 'low',
              centro_code: account.centro_code,
              centro_name: centroName,
              amount: tx.amount,
              created_at: tx.transaction_date,
              metadata: { transaction: tx },
            });
          }
        }
      }

      // Sort by priority and date
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
      return tasks.sort((a, b) => {
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    },
    refetchInterval: 60000, // Refetch every minute
  });
}
