// ============================================================================
// VALIDATE POSTING - Validación de asientos contables antes de posting
// Refactorización modular de validatePosting original
// ============================================================================

import {
  buildAPJournalPreview,
  detectBlockingIssues,
  type JournalLine,
  type InvoiceTotals
} from './core/index.ts';

import type { AccountMappingResult } from './map-ap.ts';

/**
 * Resultado de validación de posting
 */
export interface PostingValidationResult {
  ready_to_post: boolean;
  blocking_issues: string[];
  post_preview: JournalLine[];
}

/**
 * Factura para validación de posting
 */
export interface InvoiceForPosting {
  totals: InvoiceTotals;
}

/**
 * Valida que un asiento está listo para posting
 * 
 * Validaciones:
 * - Centro asignado (obligatorio)
 * - Debe = Haber (tolerancia 0.01€)
 * 
 * @param invoice - Factura con totales
 * @param mapping - Resultado de mapAP
 * @returns Validación + preview del asiento
 */
export function validatePosting(
  invoice: InvoiceForPosting,
  mapping: AccountMappingResult
): PostingValidationResult {
  
  // ========================================================================
  // 1. CONSTRUIR PREVIEW DEL ASIENTO
  // ========================================================================
  
  const preview = buildAPJournalPreview(invoice.totals, mapping);
  
  // ========================================================================
  // 2. DETECTAR ISSUES BLOQUEANTES
  // ========================================================================
  
  const issues = detectBlockingIssues(preview, mapping.centre_id);
  
  // ========================================================================
  // 3. DETERMINAR SI ESTÁ LISTO
  // ========================================================================
  
  const readyToPost = issues.length === 0;
  
  return {
    ready_to_post: readyToPost,
    blocking_issues: issues,
    post_preview: preview
  };
}
