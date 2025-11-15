import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface FiscalYear {
  id: string;
  year: number;
  start_date: string;
  end_date: string;
  status: 'open' | 'closed';
  centro_code: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateFiscalYearParams {
  year: number;
  startDate: string;
  endDate: string;
  centroCode: string;
}

export function useFiscalYears(centroCode?: string) {
  return useQuery({
    queryKey: ['fiscal-years', centroCode],
    queryFn: async () => {
      let query = supabase
        .from('fiscal_years')
        .select('*')
        .order('year', { ascending: false });
      
      if (centroCode) {
        query = query.eq('centro_code', centroCode);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as FiscalYear[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useCreateFiscalYear() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateFiscalYearParams) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const { data, error } = await supabase
        .from('fiscal_years')
        .insert({
          year: params.year,
          start_date: params.startDate,
          end_date: params.endDate,
          centro_code: params.centroCode,
          status: 'open',
        })
        .select()
        .single();

      if (error) throw error;
      return data as FiscalYear;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fiscal-years'] });
      toast.success('Ejercicio fiscal creado correctamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al crear ejercicio fiscal: ${error.message}`);
    },
  });
}

export function useCloseFiscalYear() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (fiscalYearId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const { error } = await supabase
        .from('fiscal_years')
        .update({ status: 'closed' })
        .eq('id', fiscalYearId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fiscal-years'] });
      toast.success('Ejercicio fiscal cerrado correctamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al cerrar ejercicio fiscal: ${error.message}`);
    },
  });
}
