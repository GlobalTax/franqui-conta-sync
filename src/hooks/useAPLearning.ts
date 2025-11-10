import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface APLearningRequest {
  invoiceId: string;
  lines: Array<{
    lineId: string;
    description: string;
    amount: number;
    suggestedAccount: string;
    correctedAccount: string;
    suggestedRuleId: string | null;
    suggestedConfidence: number;
  }>;
  supplierId: string | null;
  supplierName: string;
  supplierTaxId: string | null;
  centroCode: string;
}

export interface APLearningResponse {
  success: boolean;
  corrections: number;
  rulesGenerated: number;
  autoApproved: number;
  rules: any[];
}

/**
 * Hook para sistema de aprendizaje automático del motor AP
 * Threshold híbrido: Auto-aprueba si confidence >= 85%
 */
export const useAPLearning = () => {
  return useMutation({
    mutationFn: async (learningData: APLearningRequest): Promise<APLearningResponse> => {
      const { data, error } = await supabase.functions.invoke('ap-learning', {
        body: learningData
      });

      if (error) {
        throw new Error(error.message || 'Error en sistema de aprendizaje');
      }

      return data as APLearningResponse;
    }
  });
};
