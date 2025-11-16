import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// ============================================================================
// INTERFACES
// ============================================================================

export interface AutoPostingEvolution {
  date: string;
  total_invoices: number;
  auto_posted: number;
  manual_review: number;
  auto_post_rate: number;
  avg_confidence: number;
}

export interface TopCorrectedSupplier {
  supplier_id: string | null;
  supplier_name: string | null;
  supplier_tax_id: string | null;
  correction_count: number;
  most_common_account: string;
  has_pattern: boolean;
}

export interface LearningPattern {
  id: string;
  supplier_name: string | null;
  learned_expense_account: string;
  learned_tax_account: string;
  learned_ap_account: string;
  occurrence_count: number;
  confidence_score: number;
  is_active: boolean;
  created_at: string;
  last_seen_at: string | null;
}

export interface AccountAccuracy {
  account_group: string;
  account_group_name: string;
  total_mappings: number;
  correct_mappings: number;
  accuracy_rate: number;
}

export interface OCRMetrics {
  total_tokens: number;
  avg_cost_per_invoice: number;
  avg_processing_time: number;
  openai_cost: number;
  mindee_cost: number;
}

// ============================================================================
// HOOK: useAutoPostingEvolution
// ============================================================================

export const useAutoPostingEvolution = (days: number = 30) => {
  return useQuery({
    queryKey: ['auto-posting-evolution', days],
    queryFn: async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Consultar métricas diarias de auto-posting
      const { data, error } = await supabase
        .from('invoices_received')
        .select('created_at, approval_status, ocr_confidence')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Agrupar por fecha y calcular métricas
      const dailyMetrics = new Map<string, AutoPostingEvolution>();

      data?.forEach((invoice) => {
        const date = new Date(invoice.created_at).toISOString().split('T')[0];
        
        if (!dailyMetrics.has(date)) {
          dailyMetrics.set(date, {
            date,
            total_invoices: 0,
            auto_posted: 0,
            manual_review: 0,
            auto_post_rate: 0,
            avg_confidence: 0,
          });
        }

        const metrics = dailyMetrics.get(date)!;
        metrics.total_invoices++;

        // Consideramos auto-posted si la confianza es >= 85% y está aprobada
        if (invoice.ocr_confidence && invoice.ocr_confidence >= 85 && invoice.approval_status === 'approved') {
          metrics.auto_posted++;
        } else if (invoice.approval_status === 'ocr_review' || invoice.approval_status === 'pending') {
          metrics.manual_review++;
        }
      });

      // Calcular tasas y promedios
      const result: AutoPostingEvolution[] = Array.from(dailyMetrics.values()).map((metrics) => {
        const confidenceSum = data
          ?.filter((inv) => new Date(inv.created_at).toISOString().split('T')[0] === metrics.date)
          .reduce((sum, inv) => sum + (inv.ocr_confidence || 0), 0) || 0;

        return {
          ...metrics,
          auto_post_rate: metrics.total_invoices > 0 
            ? (metrics.auto_posted / metrics.total_invoices) * 100 
            : 0,
          avg_confidence: metrics.total_invoices > 0 
            ? confidenceSum / metrics.total_invoices 
            : 0,
        };
      });

      return result;
    },
    staleTime: 5 * 60 * 1000,
  });
};

// ============================================================================
// HOOK: useTopCorrectedSuppliers
// ============================================================================

export const useTopCorrectedSuppliers = (limit: number = 10) => {
  return useQuery({
    queryKey: ['top-corrected-suppliers', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ap_learning_corrections')
        .select('supplier_id, supplier_name, supplier_tax_id, corrected_account, suggested_account')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Agrupar por proveedor y contar correcciones
      const supplierMap = new Map<string, TopCorrectedSupplier>();

      data?.forEach((correction) => {
        const key = correction.supplier_id || correction.supplier_name || 'unknown';
        
        if (!supplierMap.has(key)) {
          supplierMap.set(key, {
            supplier_id: correction.supplier_id,
            supplier_name: correction.supplier_name,
            supplier_tax_id: correction.supplier_tax_id,
            correction_count: 0,
            most_common_account: correction.corrected_account,
            has_pattern: false,
          });
        }

        const supplier = supplierMap.get(key)!;
        supplier.correction_count++;
      });

      // Ordenar por número de correcciones y tomar top N
      const result = Array.from(supplierMap.values())
        .sort((a, b) => b.correction_count - a.correction_count)
        .slice(0, limit);

      return result;
    },
    staleTime: 5 * 60 * 1000,
  });
};

// ============================================================================
// HOOK: useLearningPatterns
// ============================================================================

export const useLearningPatterns = () => {
  return useQuery({
    queryKey: ['learning-patterns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ap_learned_patterns')
        .select(`
          id,
          supplier_id,
          learned_expense_account,
          learned_tax_account,
          learned_ap_account,
          occurrence_count,
          confidence_score,
          is_active,
          created_at,
          last_seen_at,
          suppliers (
            nombre_fiscal
          )
        `)
        .order('occurrence_count', { ascending: false });

      if (error) throw error;

      const patterns: LearningPattern[] = (data || []).map((pattern: any) => ({
        id: pattern.id,
        supplier_name: pattern.suppliers?.nombre_fiscal || null,
        learned_expense_account: pattern.learned_expense_account,
        learned_tax_account: pattern.learned_tax_account,
        learned_ap_account: pattern.learned_ap_account,
        occurrence_count: pattern.occurrence_count || 0,
        confidence_score: pattern.confidence_score || 0,
        is_active: pattern.is_active || false,
        created_at: pattern.created_at,
        last_seen_at: pattern.last_seen_at,
      }));

      return patterns;
    },
    staleTime: 5 * 60 * 1000,
  });
};

// ============================================================================
// HOOK: useAccountAccuracy
// ============================================================================

export const useAccountAccuracy = () => {
  return useQuery({
    queryKey: ['account-accuracy'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ap_learning_corrections')
        .select('suggested_account, corrected_account');

      if (error) throw error;

      // Agrupar por grupo PGC
      const groupMap = new Map<string, { total: number; correct: number; name: string }>();

      const getAccountGroup = (account: string): { group: string; name: string } => {
        const prefix = account.substring(0, 2);
        const groupNames: Record<string, string> = {
          '60': 'Compras y Gastos',
          '62': 'Servicios Externos',
          '64': 'Gastos de Personal',
          '47': 'IVA',
          '40': 'Acreedores',
        };
        return { group: prefix, name: groupNames[prefix] || 'Otros' };
      };

      data?.forEach((correction) => {
        const { group, name } = getAccountGroup(correction.suggested_account);
        
        if (!groupMap.has(group)) {
          groupMap.set(group, { total: 0, correct: 0, name });
        }

        const metrics = groupMap.get(group)!;
        metrics.total++;
        
        if (correction.suggested_account === correction.corrected_account) {
          metrics.correct++;
        }
      });

      const result: AccountAccuracy[] = Array.from(groupMap.entries()).map(([group, metrics]) => ({
        account_group: group,
        account_group_name: metrics.name,
        total_mappings: metrics.total,
        correct_mappings: metrics.correct,
        accuracy_rate: metrics.total > 0 ? (metrics.correct / metrics.total) * 100 : 0,
      }));

      return result;
    },
    staleTime: 5 * 60 * 1000,
  });
};
