import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ReconciliationRule } from './useBankReconciliation';

export function useReconciliationRules(centroCode?: string, bankAccountId?: string) {
  return useQuery({
    queryKey: ['reconciliation-rules', centroCode, bankAccountId],
    queryFn: async () => {
      let query = supabase
        .from('reconciliation_rules' as any)
        .select('*')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (centroCode) {
        query = query.eq('centro_code', centroCode);
      }
      if (bankAccountId) {
        query = query.eq('bank_account_id', bankAccountId);
      }

      let { data, error } = await query;
      
      // Fallback: si reconciliation_rules no existe, intentar bank_reconciliation_rules
      if (error && (error as any).code === '42P01') {
        query = supabase
          .from('bank_reconciliation_rules' as any)
          .select('*')
          .order('priority', { ascending: false })
          .order('created_at', { ascending: false });

        if (centroCode) {
          query = query.eq('centro_code', centroCode);
        }
        if (bankAccountId) {
          query = query.eq('bank_account_id', bankAccountId);
        }

        const fallbackResult = await query;
        data = fallbackResult.data;
        error = fallbackResult.error;
      }
      
      if (error) throw error;
      return data as any as ReconciliationRule[];
    },
  });
}

export function useCreateReconciliationRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rule: Omit<Partial<ReconciliationRule>, 'id' | 'created_at' | 'updated_at'> & { centro_code: string; bank_account_id: string; rule_name: string; auto_match_type: string }) => {
      let { data, error } = await supabase
        .from('reconciliation_rules' as any)
        .insert([rule])
        .select()
        .single();

      // Fallback a bank_reconciliation_rules si no existe reconciliation_rules
      if (error && (error as any).code === '42P01') {
        const fallbackResult = await supabase
          .from('bank_reconciliation_rules' as any)
          .insert([rule])
          .select()
          .single();
        data = fallbackResult.data;
        error = fallbackResult.error;
      }

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reconciliation-rules'] });
      toast.success('Regla de conciliación creada');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al crear regla');
    },
  });
}

export function useUpdateReconciliationRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ReconciliationRule> & { id: string }) => {
      let { data, error } = await supabase
        .from('reconciliation_rules' as any)
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      // Fallback a bank_reconciliation_rules
      if (error && (error as any).code === '42P01') {
        const fallbackResult = await supabase
          .from('bank_reconciliation_rules' as any)
          .update(updates)
          .eq('id', id)
          .select()
          .single();
        data = fallbackResult.data;
        error = fallbackResult.error;
      }

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reconciliation-rules'] });
      toast.success('Regla actualizada');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al actualizar regla');
    },
  });
}

export function useDeleteReconciliationRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      let { error } = await supabase
        .from('reconciliation_rules' as any)
        .delete()
        .eq('id', id);

      // Fallback a bank_reconciliation_rules
      if (error && (error as any).code === '42P01') {
        const fallbackResult = await supabase
          .from('bank_reconciliation_rules' as any)
          .delete()
          .eq('id', id);
        error = fallbackResult.error;
      }

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reconciliation-rules'] });
      toast.success('Regla eliminada');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al eliminar regla');
    },
  });
}

export function useToggleRuleActive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      let { data, error } = await supabase
        .from('reconciliation_rules' as any)
        .update({ active })
        .eq('id', id)
        .select()
        .single();

      // Fallback a bank_reconciliation_rules
      if (error && (error as any).code === '42P01') {
        const fallbackResult = await supabase
          .from('bank_reconciliation_rules' as any)
          .update({ active })
          .eq('id', id)
          .select()
          .single();
        data = fallbackResult.data;
        error = fallbackResult.error;
      }

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reconciliation-rules'] });
      toast.success('Estado de regla actualizado');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al cambiar estado');
    },
  });
}
