import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface DailyClosure {
  id: string;
  centro_code: string;
  closure_date: string;
  sales_in_store: number;
  sales_drive_thru: number;
  sales_delivery: number;
  sales_kiosk: number;
  total_sales: number;
  tax_10_base: number;
  tax_10_amount: number;
  tax_21_base: number;
  tax_21_amount: number;
  total_tax: number;
  cash_amount: number;
  card_amount: number;
  delivery_amount: number;
  delivery_commission: number;
  royalty_amount: number;
  marketing_fee: number;
  expected_cash: number;
  actual_cash: number;
  cash_difference: number;
  status: 'draft' | 'validated_manager' | 'posted' | 'closed';
  validated_by: string | null;
  validated_at: string | null;
  posted_by: string | null;
  posted_at: string | null;
  accounting_entry_id: string | null;
  pos_data: any;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useDailyClosures(centroCode?: string, startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['daily-closures', centroCode, startDate, endDate],
    queryFn: async () => {
      let query = supabase
        .from('daily_closures')
        .select('*')
        .order('closure_date', { ascending: false });

      if (centroCode) {
        query = query.eq('centro_code', centroCode);
      }
      if (startDate) {
        query = query.gte('closure_date', startDate);
      }
      if (endDate) {
        query = query.lte('closure_date', endDate);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as DailyClosure[];
    },
  });
}

export function useCreateDailyClosure() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (closure: Omit<Partial<DailyClosure>, 'id' | 'created_at' | 'updated_at' | 'total_sales' | 'cash_difference'> & { centro_code: string; closure_date: string }) => {
      const { data, error } = await supabase
        .from('daily_closures')
        .insert([closure])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-closures'] });
      toast.success('Cierre diario creado correctamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al crear cierre diario');
    },
  });
}

export function useUpdateDailyClosure() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DailyClosure> & { id: string }) => {
      const { data, error } = await supabase
        .from('daily_closures')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-closures'] });
      toast.success('Cierre diario actualizado correctamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al actualizar cierre diario');
    },
  });
}

export function useValidateClosure() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (closureId: string) => {
      const { data, error } = await supabase
        .from('daily_closures')
        .update({
          status: 'validated_manager',
          validated_at: new Date().toISOString(),
        })
        .eq('id', closureId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-closures'] });
      toast.success('Cierre validado por gerente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al validar cierre');
    },
  });
}

export function usePostClosure() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (closureId: string) => {
      const { data, error } = await supabase.rpc('generate_daily_closure_entry', {
        closure_id: closureId,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-closures'] });
      queryClient.invalidateQueries({ queryKey: ['accounting-entries'] });
      toast.success('Cierre contabilizado correctamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al contabilizar cierre');
    },
  });
}

export function useDeleteDailyClosure() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('daily_closures').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-closures'] });
      toast.success('Cierre diario eliminado');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al eliminar cierre');
    },
  });
}
