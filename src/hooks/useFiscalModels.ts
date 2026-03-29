// ============================================================================
// HOOK - FISCAL MODELS (111, 190, 347, 390)
// Generación automática de modelos fiscales españoles
// ============================================================================

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// ============================================================================
// MODELO 111 - Retenciones e ingresos a cuenta IRPF (trimestral)
// ============================================================================

export interface Modelo111Data {
  trimestre: number;
  year: number;
  // Rendimientos del trabajo
  perceptoresTrabajo: number;
  baseRetencionTrabajo: number;
  retencionTrabajo: number;
  // Rendimientos actividades profesionales
  perceptoresProfesionales: number;
  baseRetencionProfesionales: number;
  retencionProfesionales: number;
  // Totales
  totalPerceptores: number;
  totalBaseRetenciones: number;
  totalRetenciones: number;
}

export function useModelo111(centroCode?: string, year?: number, trimestre?: number) {
  return useQuery({
    queryKey: ['modelo-111', centroCode, year, trimestre],
    queryFn: async (): Promise<Modelo111Data | null> => {
      if (!centroCode || !year || !trimestre) return null;

      const startMonth = (trimestre - 1) * 3;
      const startDate = `${year}-${String(startMonth + 1).padStart(2, '0')}-01`;
      const endMonth = startMonth + 3;
      const endDate = endMonth <= 12
        ? `${year}-${String(endMonth).padStart(2, '0')}-${new Date(year, endMonth, 0).getDate()}`
        : `${year}-12-31`;

      // Obtener nóminas del período
      const { data: nominas } = await supabase
        .from('stg_nominas')
        .select('*')
        .eq('centro_code', centroCode)
        .gte('periodo_liquidacion', startDate)
        .lte('periodo_liquidacion', endDate)
        .eq('status', 'posted');

      const trabajadores = (nominas || []).filter(n => n.tipo_nomina !== 'autonomo');
      const profesionales = (nominas || []).filter(n => n.tipo_nomina === 'autonomo');

      const uniqueTrabajadores = new Set(trabajadores.map(n => n.empleado_nif));
      const uniqueProfesionales = new Set(profesionales.map(n => n.empleado_nif));

      const baseRetencionTrabajo = trabajadores.reduce((s, n) => s + (Number(n.importe_bruto) || 0), 0);
      const retencionTrabajo = trabajadores.reduce((s, n) => s + (Number(n.retencion_irpf) || 0), 0);
      const baseRetencionProfesionales = profesionales.reduce((s, n) => s + (Number(n.importe_bruto) || 0), 0);
      const retencionProfesionales = profesionales.reduce((s, n) => s + (Number(n.retencion_irpf) || 0), 0);

      return {
        trimestre,
        year,
        perceptoresTrabajo: uniqueTrabajadores.size,
        baseRetencionTrabajo,
        retencionTrabajo,
        perceptoresProfesionales: uniqueProfesionales.size,
        baseRetencionProfesionales,
        retencionProfesionales,
        totalPerceptores: uniqueTrabajadores.size + uniqueProfesionales.size,
        totalBaseRetenciones: baseRetencionTrabajo + baseRetencionProfesionales,
        totalRetenciones: retencionTrabajo + retencionProfesionales,
      };
    },
    enabled: !!centroCode && !!year && !!trimestre,
  });
}

// ============================================================================
// MODELO 190 - Resumen anual retenciones IRPF
// ============================================================================

export interface Modelo190Perceptor {
  nif: string;
  nombre: string;
  clave: string; // A = trabajo, G = profesional
  subClave: string;
  retribucionDineraria: number;
  retencionPracticada: number;
}

export interface Modelo190Data {
  year: number;
  totalPerceptores: number;
  totalRetribuciones: number;
  totalRetenciones: number;
  perceptores: Modelo190Perceptor[];
}

export function useModelo190(centroCode?: string, year?: number) {
  return useQuery({
    queryKey: ['modelo-190', centroCode, year],
    queryFn: async (): Promise<Modelo190Data | null> => {
      if (!centroCode || !year) return null;

      const { data: nominas } = await supabase
        .from('stg_nominas')
        .select('*')
        .eq('centro_code', centroCode)
        .gte('periodo_liquidacion', `${year}-01-01`)
        .lte('periodo_liquidacion', `${year}-12-31`)
        .eq('status', 'posted');

      // Agrupar por perceptor
      const perceptorMap = new Map<string, Modelo190Perceptor>();

      for (const n of (nominas || [])) {
        const nif = n.empleado_nif;
        const existing = perceptorMap.get(nif) || {
          nif,
          nombre: n.empleado_nombre,
          clave: n.tipo_nomina === 'autonomo' ? 'G' : 'A',
          subClave: '01',
          retribucionDineraria: 0,
          retencionPracticada: 0,
        };

        existing.retribucionDineraria += Number(n.importe_bruto) || 0;
        existing.retencionPracticada += Number(n.retencion_irpf) || 0;
        perceptorMap.set(nif, existing);
      }

      const perceptores = Array.from(perceptorMap.values());

      return {
        year,
        totalPerceptores: perceptores.length,
        totalRetribuciones: perceptores.reduce((s, p) => s + p.retribucionDineraria, 0),
        totalRetenciones: perceptores.reduce((s, p) => s + p.retencionPracticada, 0),
        perceptores,
      };
    },
    enabled: !!centroCode && !!year,
  });
}

// ============================================================================
// MODELO 347 - Operaciones con terceros (>3.005,06€ anuales)
// ============================================================================

export interface Modelo347Operacion {
  nif: string;
  nombre: string;
  tipo: 'proveedor' | 'cliente';
  importeAnual: number;
  importeT1: number;
  importeT2: number;
  importeT3: number;
  importeT4: number;
}

export interface Modelo347Data {
  year: number;
  umbral: number;
  totalOperaciones: number;
  importeTotal: number;
  operaciones: Modelo347Operacion[];
}

export function useModelo347(centroCode?: string, year?: number) {
  return useQuery({
    queryKey: ['modelo-347', centroCode, year],
    queryFn: async (): Promise<Modelo347Data | null> => {
      if (!centroCode || !year) return null;

      const UMBRAL = 3005.06;

      // Facturas recibidas (proveedores)
      const { data: facturasRecibidas } = await supabase
        .from('invoices_received')
        .select('*, supplier:suppliers(name, tax_id)')
        .eq('centro_code', centroCode)
        .gte('invoice_date', `${year}-01-01`)
        .lte('invoice_date', `${year}-12-31`)
        .not('supplier_id', 'is', null);

      // Facturas emitidas (clientes)
      const { data: facturasEmitidas } = await supabase
        .from('invoices_issued')
        .select('*')
        .eq('centro_code', centroCode)
        .gte('invoice_date', `${year}-01-01`)
        .lte('invoice_date', `${year}-12-31`);

      const operacionMap = new Map<string, Modelo347Operacion>();

      // Procesar proveedores
      for (const f of (facturasRecibidas || [])) {
        const nif = f.supplier?.tax_id;
        if (!nif) continue;
        const trimestre = Math.ceil((new Date(f.invoice_date).getMonth() + 1) / 3);
        const key = `P-${nif}`;
        const existing = operacionMap.get(key) || {
          nif,
          nombre: f.supplier?.name || 'Desconocido',
          tipo: 'proveedor' as const,
          importeAnual: 0,
          importeT1: 0, importeT2: 0, importeT3: 0, importeT4: 0,
        };

        const total = Number(f.total) || 0;
        existing.importeAnual += total;
        if (trimestre === 1) existing.importeT1 += total;
        else if (trimestre === 2) existing.importeT2 += total;
        else if (trimestre === 3) existing.importeT3 += total;
        else existing.importeT4 += total;
        operacionMap.set(key, existing);
      }

      // Procesar clientes
      for (const f of (facturasEmitidas || [])) {
        const nif = f.customer_tax_id;
        if (!nif) continue;
        const trimestre = Math.ceil((new Date(f.invoice_date).getMonth() + 1) / 3);
        const key = `C-${nif}`;
        const existing = operacionMap.get(key) || {
          nif,
          nombre: f.customer_name || 'Desconocido',
          tipo: 'cliente' as const,
          importeAnual: 0,
          importeT1: 0, importeT2: 0, importeT3: 0, importeT4: 0,
        };

        const total = Number(f.total) || 0;
        existing.importeAnual += total;
        if (trimestre === 1) existing.importeT1 += total;
        else if (trimestre === 2) existing.importeT2 += total;
        else if (trimestre === 3) existing.importeT3 += total;
        else existing.importeT4 += total;
        operacionMap.set(key, existing);
      }

      // Filtrar por umbral
      const operaciones = Array.from(operacionMap.values())
        .filter(o => Math.abs(o.importeAnual) >= UMBRAL)
        .sort((a, b) => Math.abs(b.importeAnual) - Math.abs(a.importeAnual));

      return {
        year,
        umbral: UMBRAL,
        totalOperaciones: operaciones.length,
        importeTotal: operaciones.reduce((s, o) => s + o.importeAnual, 0),
        operaciones,
      };
    },
    enabled: !!centroCode && !!year,
  });
}

// ============================================================================
// MODELO 390 - Resumen anual IVA
// ============================================================================

export interface Modelo390Data {
  year: number;
  // IVA Devengado (repercutido)
  baseImponible21: number;
  cuotaDevengada21: number;
  baseImponible10: number;
  cuotaDevengada10: number;
  baseImponible4: number;
  cuotaDevengada4: number;
  totalBaseDevengado: number;
  totalCuotaDevengado: number;
  // IVA Deducible (soportado)
  baseImponibleSoportado: number;
  cuotaDeducible: number;
  // Resultados
  resultadoAnual: number;
  // Liquidaciones trimestrales
  liquidacionesTrimestrales: number;
  resultadoFinal: number;
}

export function useModelo390(centroCode?: string, year?: number) {
  return useQuery({
    queryKey: ['modelo-390', centroCode, year],
    queryFn: async (): Promise<Modelo390Data | null> => {
      if (!centroCode || !year) return null;

      // IVA Repercutido (emitidas + daily closures)
      const { data: emitidas } = await supabase
        .from('invoices_issued')
        .select('subtotal, tax_total, total')
        .eq('centro_code', centroCode)
        .gte('invoice_date', `${year}-01-01`)
        .lte('invoice_date', `${year}-12-31`);

      const { data: closures } = await supabase
        .from('daily_closures')
        .select('tax_10_base, tax_10_amount, tax_21_base, tax_21_amount, total_tax')
        .eq('centro_code', centroCode)
        .gte('closure_date', `${year}-01-01`)
        .lte('closure_date', `${year}-12-31`)
        .in('status', ['posted', 'closed']);

      // IVA Soportado (recibidas)
      const { data: recibidas } = await supabase
        .from('invoices_received')
        .select('subtotal, tax_total, total')
        .eq('centro_code', centroCode)
        .gte('invoice_date', `${year}-01-01`)
        .lte('invoice_date', `${year}-12-31`);

      // Acumular datos de closures
      const tax10Base = (closures || []).reduce((s, c) => s + (Number(c.tax_10_base) || 0), 0);
      const tax10Amount = (closures || []).reduce((s, c) => s + (Number(c.tax_10_amount) || 0), 0);
      const tax21Base = (closures || []).reduce((s, c) => s + (Number(c.tax_21_base) || 0), 0);
      const tax21Amount = (closures || []).reduce((s, c) => s + (Number(c.tax_21_amount) || 0), 0);

      // Sumar facturas emitidas (asumimos 21% estándar para simplificar)
      const emisBase = (emitidas || []).reduce((s, e) => s + (Number(e.subtotal) || 0), 0);
      const emisTax = (emitidas || []).reduce((s, e) => s + (Number(e.tax_total) || 0), 0);

      const baseImponible21 = tax21Base + emisBase;
      const cuotaDevengada21 = tax21Amount + emisTax;
      const baseImponible10 = tax10Base;
      const cuotaDevengada10 = tax10Amount;

      const totalBaseDevengado = baseImponible21 + baseImponible10;
      const totalCuotaDevengado = cuotaDevengada21 + cuotaDevengada10;

      const baseImponibleSoportado = (recibidas || []).reduce((s, r) => s + (Number(r.subtotal) || 0), 0);
      const cuotaDeducible = (recibidas || []).reduce((s, r) => s + (Number(r.tax_total) || 0), 0);

      const resultadoAnual = totalCuotaDevengado - cuotaDeducible;

      return {
        year,
        baseImponible21,
        cuotaDevengada21,
        baseImponible10,
        cuotaDevengada10,
        baseImponible4: 0,
        cuotaDevengada4: 0,
        totalBaseDevengado,
        totalCuotaDevengado,
        baseImponibleSoportado,
        cuotaDeducible,
        resultadoAnual,
        liquidacionesTrimestrales: 0, // Se calcula sumando los 303 trimestrales
        resultadoFinal: resultadoAnual,
      };
    },
    enabled: !!centroCode && !!year,
  });
}
