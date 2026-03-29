// ============================================================================
// HOOK - LABOR COST KPIs
// KPIs laborales: CPLH (Cost Per Labor Hour), Ventas/Hora
// ============================================================================

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface LaborCostKPIs {
  period: string;
  centroCode: string;
  totalHours: number;
  totalLaborCost: number;
  totalSales: number;
  cplh: number; // Cost Per Labor Hour
  salesPerHour: number;
  laborCostPercentage: number; // % ventas que se destina a costes laborales
  employeeCount: number;
}

export interface LaborCostDetail {
  employeeName: string;
  employeeNif: string;
  hoursWorked: number;
  grossSalary: number;
  socialSecurity: number;
  totalCost: number;
  costPerHour: number;
}

export function useLaborCostKPIs(centroCode?: string, startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['labor-cost-kpis', centroCode, startDate, endDate],
    queryFn: async (): Promise<LaborCostKPIs | null> => {
      if (!centroCode || !startDate || !endDate) return null;

      // Obtener costes laborales del período
      const { data: payrollData, error: payrollError } = await supabase
        .from('stg_nominas')
        .select('*')
        .eq('centro_code', centroCode)
        .gte('periodo_liquidacion', startDate)
        .lte('periodo_liquidacion', endDate)
        .eq('status', 'posted');

      if (payrollError) throw payrollError;

      // Obtener horas de Orquest (si hay datos)
      const { data: scheduleData } = await supabase
        .from('orquest_schedules')
        .select('total_hours, employee_id')
        .eq('centro_code', centroCode)
        .gte('date', startDate)
        .lte('date', endDate);

      // Obtener ventas del período desde daily_closures
      const { data: salesData } = await supabase
        .from('daily_closures')
        .select('total_sales')
        .eq('centro_code', centroCode)
        .gte('closure_date', startDate)
        .lte('closure_date', endDate)
        .in('status', ['posted', 'closed']);

      const totalLaborCost = (payrollData || []).reduce((sum, p) =>
        sum + (Number(p.sueldos_salarios) || 0) + (Number(p.seguridad_social_cargo) || 0) + (Number(p.otros_gastos_sociales) || 0), 0);

      const totalHours = (scheduleData || []).reduce((sum, s) => sum + (Number(s.total_hours) || 0), 0);
      const totalSales = (salesData || []).reduce((sum, s) => sum + (Number(s.total_sales) || 0), 0);
      const uniqueEmployees = new Set((payrollData || []).map(p => p.empleado_nif)).size;

      const cplh = totalHours > 0 ? totalLaborCost / totalHours : 0;
      const salesPerHour = totalHours > 0 ? totalSales / totalHours : 0;
      const laborCostPercentage = totalSales > 0 ? (totalLaborCost / totalSales) * 100 : 0;

      return {
        period: `${startDate} - ${endDate}`,
        centroCode,
        totalHours,
        totalLaborCost,
        totalSales,
        cplh,
        salesPerHour,
        laborCostPercentage,
        employeeCount: uniqueEmployees,
      };
    },
    enabled: !!centroCode && !!startDate && !!endDate,
  });
}

export function useLaborCostDetails(centroCode?: string, startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['labor-cost-details', centroCode, startDate, endDate],
    queryFn: async (): Promise<LaborCostDetail[]> => {
      if (!centroCode || !startDate || !endDate) return [];

      const { data: payrollData, error } = await supabase
        .from('stg_nominas')
        .select('*')
        .eq('centro_code', centroCode)
        .gte('periodo_liquidacion', startDate)
        .lte('periodo_liquidacion', endDate)
        .eq('status', 'posted')
        .order('empleado_nombre');

      if (error) throw error;

      // Agrupar por empleado
      const employeeMap = new Map<string, LaborCostDetail>();

      for (const row of (payrollData || [])) {
        const nif = row.empleado_nif;
        const existing = employeeMap.get(nif) || {
          employeeName: row.empleado_nombre,
          employeeNif: nif,
          hoursWorked: 0,
          grossSalary: 0,
          socialSecurity: 0,
          totalCost: 0,
          costPerHour: 0,
        };

        existing.grossSalary += Number(row.sueldos_salarios) || 0;
        existing.socialSecurity += Number(row.seguridad_social_cargo) || 0;
        existing.totalCost = existing.grossSalary + existing.socialSecurity;

        employeeMap.set(nif, existing);
      }

      // Obtener horas por empleado de Orquest
      const { data: scheduleData } = await supabase
        .from('orquest_schedules')
        .select('employee_id, total_hours')
        .eq('centro_code', centroCode)
        .gte('date', startDate)
        .lte('date', endDate);

      if (scheduleData) {
        for (const sched of scheduleData) {
          for (const [, detail] of employeeMap) {
            if (detail.employeeNif === sched.employee_id) {
              detail.hoursWorked += Number(sched.total_hours) || 0;
            }
          }
        }
      }

      // Calcular coste/hora
      const results = Array.from(employeeMap.values());
      for (const detail of results) {
        detail.costPerHour = detail.hoursWorked > 0 ? detail.totalCost / detail.hoursWorked : 0;
      }

      return results;
    },
    enabled: !!centroCode && !!startDate && !!endDate,
  });
}
