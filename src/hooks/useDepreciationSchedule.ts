import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DepreciationEntry {
  id: string;
  asset_id: string;
  period_year: number;
  period_month: number;
  depreciation_amount: number;
  accumulated_depreciation: number;
  book_value: number;
  accounting_entry_id: string | null;
  created_at: string;
}

export interface DepreciationScheduleRow {
  year: number;
  month: number;
  depreciation: number;
  accumulated: number;
  bookValue: number;
  entryId: string | null;
  posted: boolean;
}

export function useDepreciationSchedule(assetId?: string) {
  return useQuery({
    queryKey: ["depreciation-schedule", assetId],
    queryFn: async () => {
      if (!assetId) throw new Error("Asset ID requerido");

      const { data, error } = await supabase
        .from("asset_depreciations")
        .select("*")
        .eq("asset_id", assetId)
        .order("period_year", { ascending: true })
        .order("period_month", { ascending: true });

      if (error) throw error;
      return data as DepreciationEntry[];
    },
    enabled: !!assetId,
  });
}

export function useGenerateDepreciationSchedule(assetId?: string) {
  return useQuery({
    queryKey: ["depreciation-schedule-projection", assetId],
    queryFn: async () => {
      if (!assetId) throw new Error("Asset ID requerido");

      // Obtener datos del activo
      const { data: asset, error: assetError } = await supabase
        .from("fixed_assets")
        .select("*")
        .eq("id", assetId)
        .single();

      if (assetError) throw assetError;

      const acquisitionDate = new Date(asset.acquisition_date);
      const startYear = acquisitionDate.getFullYear();
      const startMonth = acquisitionDate.getMonth() + 1;
      const totalMonths = asset.useful_life_years * 12;
      const amortizableValue = asset.acquisition_value - (asset.residual_value || 0);

      const schedule: DepreciationScheduleRow[] = [];

      // Generar proyección según método
      if (asset.depreciation_method === 'linear') {
        const monthlyDepreciation = amortizableValue / totalMonths;
        let accumulated = 0;

        for (let i = 0; i < totalMonths; i++) {
          const monthOffset = startMonth + i - 1;
          const year = startYear + Math.floor(monthOffset / 12);
          const month = (monthOffset % 12) + 1;

          accumulated += monthlyDepreciation;
          const bookValue = asset.acquisition_value - accumulated;

          schedule.push({
            year,
            month,
            depreciation: monthlyDepreciation,
            accumulated,
            bookValue: Math.max(bookValue, asset.residual_value || 0),
            entryId: null,
            posted: false,
          });
        }
      } else if (asset.depreciation_method === 'declining') {
        // Método degresivo (suma de dígitos)
        const sumOfDigits = (asset.useful_life_years * (asset.useful_life_years + 1)) / 2;
        let accumulated = 0;

        for (let year = 0; year < asset.useful_life_years; year++) {
          const yearlyRate = (asset.useful_life_years - year) / sumOfDigits;
          const yearlyDepreciation = amortizableValue * yearlyRate;
          const monthlyDepreciation = yearlyDepreciation / 12;

          for (let month = 0; month < 12; month++) {
            const monthOffset = year * 12 + month;
            if (monthOffset >= totalMonths) break;

            const actualYear = startYear + Math.floor((startMonth + monthOffset - 1) / 12);
            const actualMonth = ((startMonth + monthOffset - 1) % 12) + 1;

            accumulated += monthlyDepreciation;
            const bookValue = asset.acquisition_value - accumulated;

            schedule.push({
              year: actualYear,
              month: actualMonth,
              depreciation: monthlyDepreciation,
              accumulated,
              bookValue: Math.max(bookValue, asset.residual_value || 0),
              entryId: null,
              posted: false,
            });
          }
        }
      }

      return schedule;
    },
    enabled: !!assetId,
  });
}

export function useDepreciationsByPeriod(year: number, month: number, centroCode?: string) {
  return useQuery({
    queryKey: ["depreciations-period", year, month, centroCode],
    queryFn: async () => {
      if (!centroCode) throw new Error("Centro code requerido");

      const { data, error } = await supabase
        .from("asset_depreciations")
        .select(`
          *,
          fixed_assets (
            asset_code,
            description,
            centro_code
          )
        `)
        .eq("period_year", year)
        .eq("period_month", month)
        .eq("fixed_assets.centro_code", centroCode);

      if (error) throw error;
      return data;
    },
    enabled: !!centroCode,
  });
}
