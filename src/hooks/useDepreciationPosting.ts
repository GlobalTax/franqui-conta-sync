import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CalculateDepreciationsParams {
  centroCode: string;
  year: number;
  month: number;
}

interface CalculateDepreciationsResult {
  success: boolean;
  assets_processed: number;
  total_depreciation: number;
  message: string;
}

export function useCalculateMonthlyDepreciations() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ centroCode, year, month }: CalculateDepreciationsParams) => {
      const { data, error } = await supabase.rpc('calculate_monthly_depreciations', {
        p_centro_code: centroCode,
        p_year: year,
        p_month: month,
      });

      if (error) throw error;
      return data as unknown as CalculateDepreciationsResult;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["fixed-assets"] });
      queryClient.invalidateQueries({ queryKey: ["depreciation-schedule"] });
      queryClient.invalidateQueries({ queryKey: ["depreciations-period"] });
      
      toast.success(result.message || `${result.assets_processed} activos procesados`);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al calcular amortizaciones");
    },
  });
}

interface PostDepreciationEntryParams {
  year: number;
  month: number;
  centroCode: string;
  userId: string;
}

export function usePostDepreciationEntries() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ year, month, centroCode, userId }: PostDepreciationEntryParams) => {
      // Obtener todas las amortizaciones del periodo
      const { data: depreciations, error: depError } = await supabase
        .from("asset_depreciations")
        .select(`
          *,
          fixed_assets (
            asset_code,
            description,
            account_code
          )
        `)
        .eq("period_year", year)
        .eq("period_month", month)
        .is("accounting_entry_id", null);

      if (depError) throw depError;
      if (!depreciations || depreciations.length === 0) {
        throw new Error("No hay amortizaciones pendientes de contabilizar");
      }

      // Calcular total
      const totalDepreciation = depreciations.reduce((sum, d) => sum + d.depreciation_amount, 0);

      // Obtener siguiente número de asiento
      const { count } = await supabase
        .from('accounting_entries')
        .select('*', { count: 'exact', head: true })
        .eq('centro_code', centroCode);

      const nextNumber = (count || 0) + 1;

      // Crear asiento contable
      const entryDate = `${year}-${month.toString().padStart(2, '0')}-${new Date(year, month, 0).getDate()}`;
      
      const { data: entry, error: entryError } = await supabase
        .from("accounting_entries")
        .insert({
          centro_code: centroCode,
          entry_number: nextNumber,
          entry_date: entryDate,
          description: `Amortización del mes ${month}/${year}`,
          status: 'posted',
          total_debit: totalDepreciation,
          total_credit: totalDepreciation,
          created_by: userId,
          posted_at: new Date().toISOString(),
          posted_by: userId,
        })
        .select()
        .single();

      if (entryError) throw entryError;

      // Crear transacciones
      const transactions = [
        {
          entry_id: entry.id,
          account_code: '6810000', // Amortización del inmovilizado material
          movement_type: 'debit' as const,
          amount: totalDepreciation,
          description: 'Amortización mensual activos fijos',
          line_number: 1,
        },
        {
          entry_id: entry.id,
          account_code: '2810000', // Amortización acumulada inmovilizado material
          movement_type: 'credit' as const,
          amount: totalDepreciation,
          description: 'Amortización acumulada',
          line_number: 2,
        },
      ];

      const { error: transError } = await supabase
        .from("accounting_transactions")
        .insert(transactions);

      if (transError) throw transError;

      // Actualizar amortizaciones con entry_id
      const { error: updateError } = await supabase
        .from("asset_depreciations")
        .update({ accounting_entry_id: entry.id })
        .eq("period_year", year)
        .eq("period_month", month)
        .is("accounting_entry_id", null);

      if (updateError) throw updateError;

      return {
        entry_id: entry.id,
        entry_number: entry.entry_number,
        total_depreciation: totalDepreciation,
        assets_count: depreciations.length,
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["accounting-entries"] });
      queryClient.invalidateQueries({ queryKey: ["depreciation-schedule"] });
      queryClient.invalidateQueries({ queryKey: ["depreciations-period"] });
      
      toast.success(`Asiento ${result.entry_number} creado: ${result.assets_count} activos contabilizados`);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al contabilizar amortizaciones");
    },
  });
}
