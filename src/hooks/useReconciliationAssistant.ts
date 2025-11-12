import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface RuleSuggestion {
  suggested_rule_name: string;
  description_pattern: string;
  transaction_type: 'debit' | 'credit';
  amount_min: number;
  amount_max: number;
  auto_match_type: string;
  confidence_threshold: number;
  priority: number;
  evidence: {
    occurrences: number;
    avg_amount: number;
    consistency_score: number;
    amount_range: {
      min: number;
      max: number;
      avg: number;
      stddev: number;
    };
  };
}

export interface PatternAnalysisResult {
  success: boolean;
  suggestions_count: number;
  suggestions: RuleSuggestion[];
  analysis_criteria: {
    min_occurrences: number;
    confidence_threshold: number;
  };
}

export function useAnalyzePatterns(centroCode?: string, bankAccountId?: string) {
  return useQuery({
    queryKey: ['analyze-patterns', centroCode, bankAccountId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('analyze_reconciliation_patterns', {
        p_centro_code: centroCode || null,
        p_bank_account_id: bankAccountId || null,
        p_min_occurrences: 3,
        p_confidence_threshold: 75,
      });

      if (error) {
        console.error('[useAnalyzePatterns] Error:', error);
        throw error;
      }

      return data as PatternAnalysisResult;
    },
    enabled: false, // Solo ejecutar manualmente
  });
}

export interface AIPatternResult {
  regex_pattern: string;
  explanation: string;
  key_terms: string[];
  confidence: number;
}

export function useEnhancePattern() {
  return useMutation({
    mutationFn: async (descriptions: string[]) => {
      const { data, error } = await supabase.functions.invoke('ai-pattern-analyzer', {
        body: { descriptions },
      });

      if (error) throw error;
      return data as AIPatternResult;
    },
    onSuccess: (data) => {
      toast.success(`Patrón generado con ${data.confidence}% de confianza`);
    },
    onError: (error: any) => {
      console.error('[useEnhancePattern] Error:', error);
      toast.error(error.message || 'Error al analizar patrón con IA');
    },
  });
}
