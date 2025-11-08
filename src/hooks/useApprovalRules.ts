import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useOrganization } from './useOrganization';

export interface ApprovalRule {
  id: string;
  centro_code: string | null;
  rule_name: string;
  min_amount: number;
  max_amount: number | null;
  requires_manager_approval: boolean;
  requires_accounting_approval: boolean;
  auto_approve_below_threshold: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ApprovalRuleFormData {
  centro_code?: string;
  rule_name: string;
  min_amount: number;
  max_amount?: number;
  requires_manager_approval: boolean;
  requires_accounting_approval: boolean;
  auto_approve_below_threshold?: boolean;
  active?: boolean;
}

export function useApprovalRules(centroCode?: string) {
  const { currentMembership } = useOrganization();
  
  return useQuery({
    queryKey: ['approval-rules', centroCode || currentMembership?.restaurant_id],
    queryFn: async () => {
      let centro = centroCode;
      
      // If no centroCode provided, get it from membership's restaurant
      if (!centro && currentMembership?.restaurant_id) {
        const { data: restaurant } = await supabase
          .from('centres')
          .select('codigo')
          .eq('id', currentMembership.restaurant_id)
          .single();
        centro = restaurant?.codigo;
      }

      const query = supabase
        .from('approval_rules')
        .select('*')
        .order('min_amount', { ascending: true });

      if (centro) {
        query.or(`centro_code.eq.${centro},centro_code.is.null`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ApprovalRule[];
    },
  });
}

export function useCreateApprovalRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ruleData: ApprovalRuleFormData) => {
      const { data, error } = await supabase
        .from('approval_rules')
        .insert(ruleData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-rules'] });
      toast.success('Regla de aprobación creada');
    },
    onError: (error: Error) => {
      toast.error(`Error al crear regla: ${error.message}`);
    },
  });
}

export function useUpdateApprovalRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ApprovalRuleFormData> }) => {
      const { data: result, error } = await supabase
        .from('approval_rules')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-rules'] });
      toast.success('Regla actualizada');
    },
    onError: (error: Error) => {
      toast.error(`Error al actualizar regla: ${error.message}`);
    },
  });
}
