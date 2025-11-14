// ============================================================================
// OCR COST CALCULATOR - Estimaciones según tarifas 2025
// ============================================================================

interface CostParams {
  engine: 'openai';
  pages: number;
  tokens_in?: number;
  tokens_out?: number;
}

interface CostBreakdown {
  cost_openai_eur: number;
  cost_total_eur: number;
}

// Tarifas actuales (2025)
const RATES = {
  openai_gpt4o: {
    input_per_1k: 0.000005,  // ~0.005 EUR por 1000 tokens
    output_per_1k: 0.000015  // ~0.015 EUR por 1000 tokens
  },
  openai_avg_invoice: {
    tokens_in: 3000,
    tokens_out: 2000,
    cost_eur: 0.08  // Promedio por factura
  }
};

/**
 * Calcula el coste estimado de procesamiento OCR
 */
export function calculateOCRCost(params: CostParams): CostBreakdown {
  let cost_openai_eur = 0;

  // Coste OpenAI (basado en tokens o promedio)
  if (params.tokens_in && params.tokens_out) {
    // Cálculo exacto si tenemos tokens
    cost_openai_eur = 
      (params.tokens_in / 1000) * RATES.openai_gpt4o.input_per_1k +
      (params.tokens_out / 1000) * RATES.openai_gpt4o.output_per_1k;
  } else {
    // Usar promedio si no hay tokens
    cost_openai_eur = RATES.openai_avg_invoice.cost_eur;
  }

  return {
    cost_openai_eur: Math.round(cost_openai_eur * 10000) / 10000,
    cost_total_eur: Math.round(cost_openai_eur * 10000) / 10000
  };
}

/**
 * Extrae el número de páginas de un PDF base64
 */
export function extractPageCount(base64Content: string, mimeType: string): number {
  if (!mimeType.includes('pdf')) return 1;
  
  try {
    // Búsqueda heurística del marcador /Type /Page en el PDF
    const pdfContent = atob(base64Content);
    const pageMatches = pdfContent.match(/\/Type\s*\/Page[^s]/g);
    return pageMatches ? pageMatches.length : 1;
  } catch (error) {
    console.warn('[Cost Calculator] Could not extract page count:', error);
    return 1;
  }
}

/**
 * Extrae tokens de la respuesta de OpenAI
 */
export function extractTokensFromOpenAI(rawResponse: any): { tokens_in: number; tokens_out: number } {
  try {
    const usage = rawResponse?.usage || rawResponse?.data?.usage || rawResponse?.raw_response?.usage;
    return {
      tokens_in: usage?.prompt_tokens || 0,
      tokens_out: usage?.completion_tokens || 0
    };
  } catch (error) {
    console.warn('[Cost Calculator] Could not extract tokens:', error);
    return { tokens_in: 0, tokens_out: 0 };
  }
}
