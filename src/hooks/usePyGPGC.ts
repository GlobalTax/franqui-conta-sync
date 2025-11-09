import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ViewSelection } from "@/contexts/ViewContext";
import { PyGPGCLine, PyGPGCData, NivelPGC } from "@/types/pgc-reports";

// ============================================================================
// HOOK PARA PyG PGC OFICIAL
// Pérdidas y Ganancias según Plan General Contable Español
// ============================================================================

/**
 * Función auxiliar para consolidar PyG de múltiples centros
 */
const consolidatePyG = (pygData: PyGPGCLine[][]): PyGPGCLine[] => {
  const consolidated: Record<string, {
    nombre: string;
    nivel: number;
    parent_code: string | null;
    debe: number;
    haber: number;
  }> = {};

  pygData.forEach(pyg => {
    pyg?.forEach((line) => {
      const key = line.cuenta;
      if (!consolidated[key]) {
        consolidated[key] = {
          nombre: line.nombre,
          nivel: line.nivel,
          parent_code: line.parent_code,
          debe: 0,
          haber: 0,
        };
      }
      consolidated[key].debe += Number(line.debe);
      consolidated[key].haber += Number(line.haber);
    });
  });

  // Calcular saldo y porcentaje
  const items = Object.entries(consolidated).map(([cuenta, data]) => ({
    cuenta,
    nombre: data.nombre,
    nivel: data.nivel,
    parent_code: data.parent_code,
    debe: data.debe,
    haber: data.haber,
    saldo: data.haber - data.debe, // Ingresos (7) - Gastos (6)
    porcentaje: 0, // Se calculará después basado en ventas totales
  }));

  // Calcular porcentajes basados en ventas (cuenta 70%)
  const totalVentas = items
    .filter(i => i.cuenta.startsWith('70'))
    .reduce((sum, i) => sum + i.saldo, 0);

  if (totalVentas !== 0) {
    items.forEach(item => {
      item.porcentaje = (item.saldo / totalVentas) * 100;
    });
  }

  return items;
};

/**
 * Hook para obtener PyG oficial PGC
 * @param viewSelection - Vista seleccionada (centro o company)
 * @param fechaInicio - Fecha inicio del periodo
 * @param fechaFin - Fecha fin del periodo
 * @param nivel - Nivel jerárquico (1=Grupo, 2=Subgrupo, 3=Cuenta)
 * @param showZeroBalance - Mostrar cuentas sin saldo
 */
export const usePyGPGC = (
  viewSelection: ViewSelection | null,
  fechaInicio: string,
  fechaFin: string,
  nivel: NivelPGC = 2,
  showZeroBalance: boolean = true
) => {
  return useQuery({
    queryKey: ["pyg-pgc", viewSelection, fechaInicio, fechaFin, nivel, showZeroBalance],
    queryFn: async (): Promise<PyGPGCData | null> => {
      if (!viewSelection) return null;

      let items: PyGPGCLine[] = [];

      if (viewSelection.type === 'company') {
        // Vista consolidada: obtener todos los centros de la sociedad
        const { data: centres } = await supabase
          .from("centres")
          .select("codigo")
          .eq("company_id", viewSelection.id)
          .eq("activo", true);

        if (!centres || centres.length === 0) {
          return null;
        }

        // Consolidar datos de todos los centros
        const promises = centres.map(c =>
          supabase.rpc("calculate_pyg_pgc", {
            p_centro_code: c.codigo,
            p_fecha_inicio: fechaInicio,
            p_fecha_fin: fechaFin,
            p_nivel: nivel,
            p_show_zero_balance: showZeroBalance
          })
        );

        const results = await Promise.all(promises);
        const allPyG = results
          .map(r => (r.data || []) as PyGPGCLine[])
          .filter(p => p.length > 0);
        
        items = consolidatePyG(allPyG);
      } else {
        // Vista individual: solo ese centro
        const { data: centre } = await supabase
          .from("centres")
          .select("codigo")
          .eq("id", viewSelection.id)
          .single();

        if (!centre) return null;

        const { data, error } = await supabase.rpc("calculate_pyg_pgc", {
          p_centro_code: centre.codigo,
          p_fecha_inicio: fechaInicio,
          p_fecha_fin: fechaFin,
          p_nivel: nivel,
          p_show_zero_balance: showZeroBalance
        });

        if (error) throw error;
        items = (data || []) as PyGPGCLine[];
      }

      // ============================================================================
      // CALCULAR TOTALES PARA PyG OFICIAL
      // ============================================================================

      // Total Ingresos (Grupo 7)
      const totalIngresos = items
        .filter(i => i.cuenta.startsWith('7'))
        .reduce((sum, i) => sum + i.saldo, 0);

      // Total Gastos (Grupo 6)
      const totalGastos = items
        .filter(i => i.cuenta.startsWith('6'))
        .reduce((sum, i) => sum + Math.abs(i.saldo), 0);

      // Resultado de Explotación (simplificado)
      // En implementación completa se usarían las cuentas específicas del PGC
      const resultadoExplotacion = totalIngresos - totalGastos;

      // Ingresos financieros (76x) y gastos financieros (66x)
      const ingresosFinancieros = items
        .filter(i => i.cuenta.startsWith('76'))
        .reduce((sum, i) => sum + i.saldo, 0);

      const gastosFinancieros = items
        .filter(i => i.cuenta.startsWith('66'))
        .reduce((sum, i) => sum + Math.abs(i.saldo), 0);

      const resultadoFinanciero = ingresosFinancieros - gastosFinancieros;

      // Resultado Antes de Impuestos (BAI)
      const resultadoAntesImpuestos = resultadoExplotacion + resultadoFinanciero;

      // Impuesto sobre beneficios (630)
      const impuestos = items
        .filter(i => i.cuenta.startsWith('630'))
        .reduce((sum, i) => sum + Math.abs(i.saldo), 0);

      // Resultado del Ejercicio
      const resultadoEjercicio = resultadoAntesImpuestos - impuestos;

      return {
        items,
        totals: {
          totalIngresos,
          totalGastos,
          resultadoExplotacion,
          resultadoFinanciero,
          resultadoAntesImpuestos,
          resultadoEjercicio,
        },
      };
    },
    enabled: !!viewSelection && !!fechaInicio && !!fechaFin,
  });
};
