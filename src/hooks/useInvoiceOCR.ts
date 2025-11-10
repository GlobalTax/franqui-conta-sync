import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface OCRRequest {
  documentPath: string;
  centroCode: string;
}

export interface OCRInvoiceData {
  document_type: "invoice" | "credit_note" | "ticket";
  issuer: {
    name: string;
    vat_id: string | null;
  };
  receiver: {
    name: string | null;
    vat_id: string | null;
    address: string | null;
  };
  invoice_number: string;
  issue_date: string;
  due_date: string | null;
  totals: {
    currency: string;
    base_10: number | null;
    vat_10: number | null;
    base_21: number | null;
    vat_21: number | null;
    other_taxes: Array<{
      type: string;
      base: number;
      quota: number;
    }>;
    total: number;
  };
  lines: Array<{
    description: string;
    quantity: number | null;
    unit_price: number | null;
    amount: number;
  }>;
  centre_hint: string | null;
  payment_method: "transfer" | "card" | "cash" | null;
  confidence_notes: string[];
  confidence_score: number;
  discrepancies: string[];
  proposed_fix: {
    what: string;
    why: string;
  } | null;
  supplier?: {
    name: string;
    taxId: string;
    matched: boolean;
    matchedId?: string;
    matchConfidence?: number;
  };
  invoiceNumber?: string;
  invoiceDate?: string;
  dueDate?: string;
  subtotal?: number;
  taxTotal?: number;
  total?: number;
}

export interface APMappingSuggestion {
  account_suggestion: string;
  tax_account: string;
  ap_account: string;
  centre_id: string | null;
  confidence_score: number;
  rationale: string;
  matched_rule_id: string | null;
  matched_rule_name: string | null;
}

export interface APMappingResult {
  invoice_level: APMappingSuggestion;
  line_level: APMappingSuggestion[];
}

export interface EntryPreviewLine {
  account: string;
  account_name?: string;
  debit: number;
  credit: number;
  description: string;
  centre_id?: string;
  line_number: number;
}

export interface InvoiceEntryValidationResult {
  ready_to_post: boolean;
  blocking_issues: string[];
  warnings: string[];
  confidence_score: number;
  post_preview: EntryPreviewLine[];
  validation_details: {
    invoice_data_valid: boolean;
    totals_match: boolean;
    ap_suggestions_valid: boolean;
    preview_balanced: boolean;
    fiscal_year_open: boolean;
  };
}

export interface OCRResponse {
  success: boolean;
  confidence: number;
  data: OCRInvoiceData;
  normalized: OCRInvoiceData;
  validation: {
    ok: boolean;
    errors: string[];
    warnings: string[];
  };
  autofix_applied: string[];
  ap_mapping: APMappingResult;
  entry_validation?: InvoiceEntryValidationResult;
  rawText?: string;
  processingTimeMs: number;
  warnings?: string[];
  error?: string;
}

export interface OCRValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export const useProcessInvoiceOCR = () => {
  return useMutation({
    mutationFn: async ({ documentPath, centroCode }: OCRRequest): Promise<OCRResponse> => {
      const { data, error } = await supabase.functions.invoke('invoice-ocr', {
        body: { documentPath, centroCode }
      });

      if (error) {
        throw new Error(error.message || 'Error al procesar OCR');
      }

      if (!data.success) {
        throw new Error(data.error || 'Error desconocido en OCR');
      }

      return data as OCRResponse;
    },
    onError: (error: any) => {
      console.error('OCR processing error:', error);
      toast.error(`Error al procesar el documento: ${error.message}`);
    }
  });
};

export const useLogOCRProcessing = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (logData: {
      invoiceId?: string;
      documentPath: string;
      ocrProvider: string;
      rawResponse: any;
      extractedData: any;
      confidence: number;
      processingTimeMs: number;
      userCorrections?: any;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('ocr_processing_log')
        .insert({
          invoice_id: logData.invoiceId || null,
          document_path: logData.documentPath,
          ocr_provider: logData.ocrProvider,
          raw_response: logData.rawResponse,
          extracted_data: logData.extractedData,
          confidence: logData.confidence,
          processing_time_ms: logData.processingTimeMs,
          user_corrections: logData.userCorrections,
          created_by: user?.id
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ocr-logs'] });
    }
  });
};

export const validateOCRData = (data: OCRInvoiceData): OCRValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

export const getConfidenceLevel = (confidence: number): {
  level: 'high' | 'medium' | 'low' | 'very-low';
  color: string;
  label: string;
} => {
  if (confidence >= 0.9) {
    return {
      level: 'high',
      color: 'text-green-600 bg-green-50 border-green-200',
      label: 'Alta confianza'
    };
  } else if (confidence >= 0.7) {
    return {
      level: 'medium',
      color: 'text-yellow-600 bg-yellow-50 border-yellow-200',
      label: 'Confianza media'
    };
  } else if (confidence >= 0.5) {
    return {
      level: 'low',
      color: 'text-orange-600 bg-orange-50 border-orange-200',
      label: 'Baja confianza'
    };
  } else {
    return {
      level: 'very-low',
      color: 'text-red-600 bg-red-50 border-red-200',
      label: 'Muy baja confianza'
    };
  }
};

export const getFieldConfidenceColor = (hasValue: boolean, confidence: number): string => {
  if (!hasValue) {
    return 'border-red-500 bg-red-50';
  }
  
  if (confidence >= 0.8) {
    return 'border-green-500 bg-green-50';
  } else if (confidence >= 0.5) {
    return 'border-yellow-500 bg-yellow-50';
  } else {
    return 'border-orange-500 bg-orange-50';
  }
};
