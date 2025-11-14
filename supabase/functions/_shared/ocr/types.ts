// ============================================================================
// OCR TYPES - Shared interfaces for all OCR modules
// ============================================================================

export type DocumentType = 'invoice' | 'credit_note' | 'ticket';

export interface EnhancedInvoiceData {
  document_type: DocumentType;
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
  validation_errors?: string[]; // Auto-validation errors from OpenAI prompt
}

export type InvoiceStatus = "processed_ok" | "needs_review" | "posted";

export interface OrchestratorLog {
  timestamp: number;
  stage: string;
  action: string;
  decision?: string;
  reason?: string;
  metrics?: {
    duration_ms?: number;
    confidence?: number;
    engine?: string;
    [key: string]: any;
  };
  data?: any;
}

export interface OpenAIExtractionResult {
  data: EnhancedInvoiceData;
  confidence_score: number;
  confidence_by_field: Record<string, number>;
  raw_response: any;
  usage?: {
    tokens_in: number;
    tokens_out: number;
    total_tokens: number;
    estimated_cost_eur: number;
  };
}

export interface OrchestratorResult {
  ocr_engine: "openai" | "manual_review";
  final_invoice_json: EnhancedInvoiceData;
  confidence_final: number;
  status: InvoiceStatus;
  merge_notes: string[];
  orchestrator_logs: OrchestratorLog[];
  raw_responses: {
    openai?: OpenAIExtractionResult;
  };
  timing: {
    ms_openai: number;
  };
  pdf_converted?: boolean;
}
