import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface BankReconciliation {
  id: string;
  bank_transaction_id: string;
  matched_type: 'daily_closure' | 'invoice_received' | 'invoice_issued' | 'entry' | 'manual' | null;
  matched_id: string | null;
  reconciliation_status: 'pending' | 'suggested' | 'matched' | 'reviewed' | 'confirmed' | 'rejected';
  confidence_score: number | null;
  rule_id: string | null;
  reconciled_by: string | null;
  reconciled_at: string | null;
  notes: string | null;
  metadata: any;
  created_at: string;
  updated_at: string;
}

export interface ReconciliationRule {
  id: string;
  centro_code: string;
  rule_name: string;
  bank_account_id: string;
  transaction_type: 'debit' | 'credit' | null;
  description_pattern: string | null;
  amount_min: number | null;
  amount_max: number | null;
  auto_match_type: 'daily_closure' | 'invoice' | 'royalty' | 'commission' | 'manual';
  suggested_account: string | null;
  confidence_threshold: number;
  active: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
}

export function useBankReconciliations(bankAccountId?: string, status?: string) {
  return useQuery({
    queryKey: ['bank-reconciliations', bankAccountId, status],
    queryFn: async () => {
      let query = supabase
        .from('bank_reconciliations')
        .select(`
          *,
          bank_transaction:bank_transactions(*)
        `)
        .order('created_at', { ascending: false });

      if (bankAccountId) {
        query = query.eq('bank_transaction.bank_account_id', bankAccountId);
      }
      if (status) {
        query = query.eq('reconciliation_status', status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as any[];
    },
    // ✅ OPTIMIZACIÓN: Caché de 2 minutos para conciliaciones bancarias
    staleTime: 2 * 60 * 1000,       // 2 minutos
    gcTime: 5 * 60 * 1000,          // 5 minutos en memoria
    refetchOnWindowFocus: true,     // Sí refetch (datos bancarios actualizados)
  });
}

export function useCreateReconciliation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reconciliation: Omit<Partial<BankReconciliation>, 'id' | 'created_at' | 'updated_at'> & { bank_transaction_id: string }) => {
      const { data, error } = await supabase
        .from('bank_reconciliations')
        .insert([reconciliation])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-reconciliations'] });
      queryClient.invalidateQueries({ queryKey: ['bank-transactions'] });
      toast.success('Conciliación creada');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al crear conciliación');
    },
  });
}

export function useUpdateReconciliation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<BankReconciliation> & { id: string }) => {
      const { data, error } = await supabase
        .from('bank_reconciliations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-reconciliations'] });
      queryClient.invalidateQueries({ queryKey: ['bank-transactions'] });
      toast.success('Conciliación actualizada');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al actualizar conciliación');
    },
  });
}

export function useConfirmReconciliation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reconciliationId: string) => {
      // REFACTORED: Usar ReconciliationValidator para validación
      const { ReconciliationValidator } = await import('@/domain/banking/services/ReconciliationValidator');
      
      // Obtener reconciliación actual
      const { data: reconciliation, error: fetchError } = await supabase
        .from('bank_reconciliations')
        .select('*')
        .eq('id', reconciliationId)
        .single();

      if (fetchError) throw fetchError;

      // Mapear de snake_case (DB) a camelCase (domain)
      const domainReconciliation = {
        id: reconciliation.id,
        bankTransactionId: reconciliation.bank_transaction_id,
        matchedType: reconciliation.matched_type,
        matchedId: reconciliation.matched_id,
        reconciliationStatus: reconciliation.reconciliation_status,
        confidenceScore: reconciliation.confidence_score,
        ruleId: reconciliation.rule_id,
        reconciledBy: reconciliation.reconciled_by,
        reconciledAt: reconciliation.reconciled_at,
        notes: reconciliation.notes,
        metadata: reconciliation.metadata,
        createdAt: reconciliation.created_at,
        updatedAt: reconciliation.updated_at,
      };

      // Validar que se pueda confirmar
      const validation = ReconciliationValidator.canConfirmReconciliation(domainReconciliation as any);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      // Confirmar reconciliación
      const { data, error } = await supabase
        .from('bank_reconciliations')
        .update({
          reconciliation_status: 'confirmed',
          reconciled_at: new Date().toISOString(),
        })
        .eq('id', reconciliationId)
        .select()
        .single();

      if (error) throw error;
      
      // Actualizar estado de transacción bancaria
      const rec = data as BankReconciliation;
      await supabase
        .from('bank_transactions')
        .update({ status: 'reconciled' })
        .eq('id', rec.bank_transaction_id);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-reconciliations'] });
      queryClient.invalidateQueries({ queryKey: ['bank-transactions'] });
      toast.success('Conciliación confirmada');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al confirmar conciliación');
    },
  });
}

export function useRejectReconciliation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      const { data, error } = await supabase
        .from('bank_reconciliations')
        .update({
          reconciliation_status: 'rejected',
          notes,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-reconciliations'] });
      queryClient.invalidateQueries({ queryKey: ['bank-transactions'] });
      toast.success('Conciliación rechazada');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al rechazar conciliación');
    },
  });
}

export function useAutoMatchTransactions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ bankAccountId, limit = 100 }: { bankAccountId: string; limit?: number }) => {
      const { data, error } = await supabase.rpc('auto_match_bank_transactions', {
        p_bank_account_id: bankAccountId,
        p_limit: limit,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data: any[]) => {
      queryClient.invalidateQueries({ queryKey: ['bank-reconciliations'] });
      queryClient.invalidateQueries({ queryKey: ['bank-transactions'] });
      toast.success(`${data?.length || 0} transacciones conciliadas automáticamente`);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error en conciliación automática');
    },
  });
}

export function useDeleteReconciliation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('bank_reconciliations')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-reconciliations'] });
      queryClient.invalidateQueries({ queryKey: ['bank-transactions'] });
      toast.success('Conciliación eliminada');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al eliminar conciliación');
    },
  });
}
