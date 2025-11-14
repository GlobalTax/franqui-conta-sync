import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// ============================================================================
// INTERFACES
// ============================================================================

export interface DigitizationMetrics {
  total_invoices: number;
  avg_confidence: number;
  total_cost_eur: number;
  cost_openai: number;
  avg_processing_time_sec: number;
  auto_post_rate: number;
  fallback_rate: number;
  low_confidence_count: number;
  post_rate: number;
  date_range: {
    start: string;
    end: string;
    centro_code: string | null;
  };
}

export interface DigitizationMetricsFilters {
  startDate: string;
  endDate: string;
  centroCode?: string | null;
}

// ============================================================================
// HOOK: useDigitizationMetrics
// ============================================================================

/**
 * Hook para obtener métricas de digitalización OCR
 * @param filters - Filtros de fecha y centro
 * @returns Query con métricas agregadas de OCR
 */
export const useDigitizationMetrics = (filters: DigitizationMetricsFilters) => {
  return useQuery({
    queryKey: ['digitization-metrics', filters.startDate, filters.endDate, filters.centroCode],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)('get_digitization_metrics', {
        p_start_date: filters.startDate,
        p_end_date: filters.endDate,
        p_centro_code: filters.centroCode || null,
      });

      if (error) {
        console.error('Error fetching digitization metrics:', error);
        throw error;
      }

      // Parse JSON response - RPC retorna JSON que necesitamos parsear
      const metrics = typeof data === 'string' ? JSON.parse(data) : data;
      return metrics as DigitizationMetrics;
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos (antes cacheTime)
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Backoff exponencial
  });
};

// ============================================================================
// HOOK AUXILIAR: useDigitizationMetricsDefault (últimos 30 días)
// ============================================================================

/**
 * Hook auxiliar que obtiene métricas de los últimos 30 días (sin filtros)
 * Útil para dashboard principal sin selector de fechas
 */
export const useDigitizationMetricsDefault = (centroCode?: string | null) => {
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  return useDigitizationMetrics({
    startDate,
    endDate,
    centroCode,
  });
};
