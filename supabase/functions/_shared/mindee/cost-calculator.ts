// ============================================================================
// MINDEE COST CALCULATOR - Estimaciones de coste según tarifa 2025
// ============================================================================

import type { MindeeAPIResponse } from './types.ts';

/**
 * Tarifas Mindee Invoice API v4 (Enero 2025)
 * Source: https://developers.mindee.com/docs/invoice-ocr#pricing
 */
const MINDEE_RATES = {
  // Tarifa por página procesada
  cost_per_page_eur: 0.10,
  
  // Descuento por volumen (opcional, configurar según plan)
  volume_discount: {
    threshold_pages: 1000,
    discount_percent: 15,
  },
  
  // Coste estimado promedio por factura española (1-2 páginas)
  avg_cost_per_invoice_eur: 0.12,
};

/**
 * Calcula el coste real de procesamiento Mindee basado en páginas
 */
export function calculateMindeeCoste(
  mindeeResponse: MindeeAPIResponse
): number {
  const pages = mindeeResponse.document.n_pages || 1;
  
  // Coste base
  let totalCost = pages * MINDEE_RATES.cost_per_page_eur;
  
  // Redondear a 4 decimales (centavos)
  return Math.round(totalCost * 10000) / 10000;
}

/**
 * Estima el coste de procesamiento antes de enviar a Mindee
 * Útil para mostrar en UI o hacer decisiones pre-procesamiento
 */
export function estimateMindeeCoste(estimatedPages: number = 1): number {
  const totalCost = estimatedPages * MINDEE_RATES.cost_per_page_eur;
  return Math.round(totalCost * 10000) / 10000;
}

/**
 * Calcula el ahorro vs. sistema anterior (OpenAI)
 * Útil para reportes de migración
 */
export function calculateSavingsVsOpenAI(params: {
  mindee_cost_eur: number;
  openai_cost_eur_legacy?: number;
}): {
  savings_eur: number;
  savings_percent: number;
} {
  const openaiCost = params.openai_cost_eur_legacy || 0.15; // Coste promedio OpenAI legacy
  
  const savingsEur = openaiCost - params.mindee_cost_eur;
  const savingsPercent = (savingsEur / openaiCost) * 100;
  
  return {
    savings_eur: Math.round(savingsEur * 10000) / 10000,
    savings_percent: Math.round(savingsPercent * 100) / 100,
  };
}

/**
 * Extrae información de coste de la respuesta completa
 */
export interface MindeeCosteBreakdown {
  pages: number;
  cost_per_page_eur: number;
  total_cost_eur: number;
  estimated_monthly_cost_eur: number; // Si procesamos ~1000 facturas/mes
}

export function getMindeeCosteBreakdown(
  mindeeResponse: MindeeAPIResponse
): MindeeCosteBreakdown {
  const pages = mindeeResponse.document.n_pages || 1;
  const totalCost = calculateMindeeCoste(mindeeResponse);
  
  return {
    pages,
    cost_per_page_eur: MINDEE_RATES.cost_per_page_eur,
    total_cost_eur: totalCost,
    estimated_monthly_cost_eur: totalCost * 1000, // Asumiendo 1000 facturas/mes
  };
}
