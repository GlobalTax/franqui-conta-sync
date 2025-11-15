import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DepreciationParams {
  assetId: string;
  method: 'linear' | 'declining' | 'units';
  acquisitionValue: number;
  residualValue: number;
  usefulLifeYears: number;
  acquisitionDate: string;
  unitsProduced?: number; // Para método de unidades
  totalUnitsEstimated?: number; // Para método de unidades
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const params: DepreciationParams = await req.json();

    const {
      assetId,
      method,
      acquisitionValue,
      residualValue,
      usefulLifeYears,
      acquisitionDate,
      unitsProduced,
      totalUnitsEstimated,
    } = params;

    const amortizableValue = acquisitionValue - residualValue;
    const totalMonths = usefulLifeYears * 12;
    const startDate = new Date(acquisitionDate);
    const startYear = startDate.getFullYear();
    const startMonth = startDate.getMonth() + 1;

    let monthlyDepreciation = 0;
    const schedule: Array<{
      period_year: number;
      period_month: number;
      depreciation_amount: number;
      accumulated_depreciation: number;
      book_value: number;
    }> = [];

    let accumulated = 0;

    if (method === 'linear') {
      // Método lineal
      monthlyDepreciation = amortizableValue / totalMonths;

      for (let i = 0; i < totalMonths; i++) {
        const monthOffset = startMonth + i - 1;
        const year = startYear + Math.floor(monthOffset / 12);
        const month = (monthOffset % 12) + 1;

        accumulated += monthlyDepreciation;
        const bookValue = acquisitionValue - accumulated;

        schedule.push({
          period_year: year,
          period_month: month,
          depreciation_amount: monthlyDepreciation,
          accumulated_depreciation: accumulated,
          book_value: Math.max(bookValue, residualValue),
        });
      }
    } else if (method === 'declining') {
      // Método degresivo (suma de dígitos)
      const sumOfDigits = (usefulLifeYears * (usefulLifeYears + 1)) / 2;

      for (let year = 0; year < usefulLifeYears; year++) {
        const yearlyRate = (usefulLifeYears - year) / sumOfDigits;
        const yearlyDepreciation = amortizableValue * yearlyRate;
        const monthlyDepreciationForYear = yearlyDepreciation / 12;

        for (let month = 0; month < 12; month++) {
          const monthOffset = year * 12 + month;
          if (monthOffset >= totalMonths) break;

          const actualYear = startYear + Math.floor((startMonth + monthOffset - 1) / 12);
          const actualMonth = ((startMonth + monthOffset - 1) % 12) + 1;

          accumulated += monthlyDepreciationForYear;
          const bookValue = acquisitionValue - accumulated;

          if (accumulated > amortizableValue) {
            accumulated = amortizableValue;
          }

          schedule.push({
            period_year: actualYear,
            period_month: actualMonth,
            depreciation_amount: monthlyDepreciationForYear,
            accumulated_depreciation: accumulated,
            book_value: Math.max(bookValue, residualValue),
          });

          if (accumulated >= amortizableValue) break;
        }

        if (accumulated >= amortizableValue) break;
      }
    } else if (method === 'units' && unitsProduced !== undefined && totalUnitsEstimated) {
      // Método de unidades de producción
      const depreciationPerUnit = amortizableValue / totalUnitsEstimated;
      monthlyDepreciation = unitsProduced * depreciationPerUnit;

      const currentDate = new Date();
      accumulated += monthlyDepreciation;
      const bookValue = acquisitionValue - accumulated;

      schedule.push({
        period_year: currentDate.getFullYear(),
        period_month: currentDate.getMonth() + 1,
        depreciation_amount: monthlyDepreciation,
        accumulated_depreciation: accumulated,
        book_value: Math.max(bookValue, residualValue),
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        schedule,
        summary: {
          asset_id: assetId,
          method,
          total_depreciation: amortizableValue,
          monthly_average: method === 'linear' ? monthlyDepreciation : 0,
          periods: schedule.length,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error calculating depreciation:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
