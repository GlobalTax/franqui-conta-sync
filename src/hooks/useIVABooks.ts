import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LibroIVARepercutido {
  fecha: string;
  numero_factura: string;
  cliente_nif: string;
  cliente_nombre: string;
  base_imponible: number;
  tipo_iva: number;
  cuota_iva: number;
  recargo_equivalencia: number;
  total_factura: number;
  tipo_operacion: string;
}

export interface LibroIVASoportado {
  fecha: string;
  numero_factura: string;
  proveedor_nif: string;
  proveedor_nombre: string;
  base_imponible: number;
  tipo_iva: number;
  cuota_iva: number;
  cuota_deducible: number;
  total_factura: number;
  tipo_operacion: string;
}

export interface IVASummary303 {
  total_base_repercutido: number;
  total_cuota_repercutido: number;
  total_base_soportado: number;
  total_cuota_soportado: number;
  total_cuota_deducible: number;
  resultado_liquidacion: number;
  compensaciones_anteriores: number;
  resultado_final: number;
}

export const useLibroIVARepercutido = (
  centroCode: string | undefined,
  startDate?: string,
  endDate?: string
) => {
  return useQuery({
    queryKey: ["libro-iva-repercutido", centroCode, startDate, endDate],
    queryFn: async () => {
      if (!centroCode || !startDate || !endDate) {
        return [];
      }

      const { data, error } = await supabase.rpc("get_libro_iva_repercutido", {
        p_centro_code: centroCode,
        p_start_date: startDate,
        p_end_date: endDate,
      });

      if (error) throw error;
      return (data || []) as LibroIVARepercutido[];
    },
    enabled: !!centroCode && !!startDate && !!endDate,
  });
};

export const useLibroIVASoportado = (
  centroCode: string | undefined,
  startDate?: string,
  endDate?: string
) => {
  return useQuery({
    queryKey: ["libro-iva-soportado", centroCode, startDate, endDate],
    queryFn: async () => {
      if (!centroCode || !startDate || !endDate) {
        return [];
      }

      const { data, error } = await supabase.rpc("get_libro_iva_soportado", {
        p_centro_code: centroCode,
        p_start_date: startDate,
        p_end_date: endDate,
      });

      if (error) throw error;
      return (data || []) as LibroIVASoportado[];
    },
    enabled: !!centroCode && !!startDate && !!endDate,
  });
};

export const useIVASummary303 = (
  centroCode: string | undefined,
  startDate?: string,
  endDate?: string
) => {
  return useQuery({
    queryKey: ["iva-summary-303", centroCode, startDate, endDate],
    queryFn: async () => {
      if (!centroCode || !startDate || !endDate) {
        return null;
      }

      const { data, error } = await supabase.rpc("get_iva_summary_303", {
        p_centro_code: centroCode,
        p_start_date: startDate,
        p_end_date: endDate,
      });

      if (error) throw error;
      return data && data.length > 0 ? (data[0] as IVASummary303) : null;
    },
    enabled: !!centroCode && !!startDate && !!endDate,
  });
};
