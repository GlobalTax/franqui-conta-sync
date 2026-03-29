// ============================================================================
// DOCUMENT ANALYZER HOOK
// Hook for analyzing document characteristics and recommending OCR engine
// ============================================================================

import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

export interface DocumentAnalysis {
  pages: number;
  quality_score: number;
  complexity: 'simple' | 'standard' | 'complex';
  estimated_text_density: number;
  is_scanned: boolean;
  recommended_engine: 'openai' | 'mindee';
  confidence: number;
  reasoning: string[];
  cost_comparison: {
    openai: number;
    mindee: number;
    savings_eur: number;
    savings_percent: number;
  };
  supplier_history?: {
    total: number;
    mindee: { count: number; avg_confidence: number };
    openai: { count: number; avg_confidence: number };
    preferred_engine: 'openai' | 'mindee';
  };
}

export function useDocumentAnalyzer() {
  return useMutation({
    mutationFn: async (params: { 
      documentPath: string;
      supplierVatId?: string;
    }): Promise<DocumentAnalysis> => {
      logger.debug('useDocumentAnalyzer', 'Analyzing document:', params);
      
      const { data, error } = await supabase.functions.invoke(
        'analyze-document-characteristics',
        { body: params }
      );

      if (error) {
        logger.error('useDocumentAnalyzer', 'Error:', error);
        throw error;
      }

      logger.debug('useDocumentAnalyzer', 'Analysis result:', data);
      return data as DocumentAnalysis;
    }
  });
}
