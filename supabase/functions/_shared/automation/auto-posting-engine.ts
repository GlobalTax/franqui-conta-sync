// ============================================================================
// AUTO-POSTING ENGINE - Intelligent auto-approval and posting
// ============================================================================

import type { EnhancedInvoiceData } from "../ocr/types.ts";

// ============================================================================
// TYPES
// ============================================================================

export interface AutoPostingCriteria {
  ocr_confidence: number;
  mapping_confidence: number;
  validation_errors: number;
  supplier_trusted: boolean;
  amount_anomaly: boolean;
  has_critical_fields: boolean;
  duplicate_risk: boolean;
}

export interface AutoPostingEvaluation {
  can_auto_post: boolean;
  confidence_score: number;
  criteria_met: AutoPostingCriteria;
  reasoning: string[];
  recommendation: 'auto_post' | 'manual_review' | 'reject';
}

// ============================================================================
// CONSTANTS
// ============================================================================

const THRESHOLDS = {
  OCR_MIN: 95,
  MAPPING_MIN: 90,
  AMOUNT_DEVIATION_MAX: 0.20,
  SUPPLIER_MIN_SUCCESS: 5,
  OVERALL_CONFIDENCE_MIN: 92,
};

// ============================================================================
// EVALUATION ENGINE
// ============================================================================

export async function evaluateAutoPosting(
  invoiceId: string,
  invoiceData: EnhancedInvoiceData,
  mappingConfidence: number,
  supabase: any
): Promise<AutoPostingEvaluation> {
  
  const reasoning: string[] = [];
  let overallConfidence = 0;
  
  // 1. OCR CONFIDENCE CHECK
  const ocrConfidence = invoiceData.confidence_score || 0;
  const ocrPass = ocrConfidence >= THRESHOLDS.OCR_MIN;
  
  if (!ocrPass) {
    reasoning.push(`❌ OCR confidence too low: ${ocrConfidence}% (min: ${THRESHOLDS.OCR_MIN}%)`);
  } else {
    reasoning.push(`✅ OCR confidence: ${ocrConfidence}%`);
    overallConfidence += 25;
  }
  
  // 2. MAPPING CONFIDENCE CHECK
  const mappingPass = mappingConfidence >= THRESHOLDS.MAPPING_MIN;
  
  if (!mappingPass) {
    reasoning.push(`❌ Mapping confidence too low: ${mappingConfidence}% (min: ${THRESHOLDS.MAPPING_MIN}%)`);
  } else {
    reasoning.push(`✅ Mapping confidence: ${mappingConfidence}%`);
    overallConfidence += 25;
  }
  
  // 3. VALIDATION ERRORS CHECK
  const validationErrors = invoiceData.discrepancies?.length || 0;
  const validationPass = validationErrors === 0;
  
  if (!validationPass) {
    reasoning.push(`❌ Validation errors: ${validationErrors}`);
  } else {
    reasoning.push(`✅ No validation errors`);
    overallConfidence += 15;
  }
  
  // 4. CRITICAL FIELDS CHECK
  const hasCriticalFields = !!(
    invoiceData.invoice_number &&
    invoiceData.issuer?.vat_id &&
    invoiceData.totals?.total != null
  );
  
  if (!hasCriticalFields) {
    reasoning.push(`❌ Missing critical fields`);
  } else {
    reasoning.push(`✅ All critical fields present`);
    overallConfidence += 10;
  }
  
  // 5. SUPPLIER TRUST CHECK
  let supplierTrusted = false;
  let avgAmount = 0;
  
  if (invoiceData.issuer?.vat_id) {
    const { data: supplier } = await supabase
      .from('suppliers')
      .select('is_trusted, successful_posts_count, avg_invoice_amount')
      .eq('tax_id', invoiceData.issuer.vat_id)
      .maybeSingle();
    
    if (supplier) {
      supplierTrusted = supplier.is_trusted || supplier.successful_posts_count >= THRESHOLDS.SUPPLIER_MIN_SUCCESS;
      avgAmount = supplier.avg_invoice_amount || 0;
      
      if (!supplierTrusted) {
        reasoning.push(`❌ Supplier not trusted (${supplier.successful_posts_count}/${THRESHOLDS.SUPPLIER_MIN_SUCCESS} posts)`);
      } else {
        reasoning.push(`✅ Trusted supplier (${supplier.successful_posts_count} posts)`);
        overallConfidence += 15;
      }
    } else {
      reasoning.push(`⚠️ New supplier`);
    }
  }
  
  // 6. AMOUNT ANOMALY DETECTION
  let amountAnomaly = false;
  
  if (supplierTrusted && avgAmount > 0 && invoiceData.totals?.total != null) {
    const currentAmount = Math.abs(invoiceData.totals.total);
    const deviation = Math.abs(currentAmount - avgAmount) / avgAmount;
    
    amountAnomaly = deviation > THRESHOLDS.AMOUNT_DEVIATION_MAX;
    
    if (amountAnomaly) {
      const deviationPercent = Math.round(deviation * 100);
      reasoning.push(`⚠️ Amount anomaly: ${currentAmount}€ vs avg ${avgAmount}€ (${deviationPercent}%)`);
    } else {
      reasoning.push(`✅ Amount within range`);
      overallConfidence += 10;
    }
  }
  
  // 7. DUPLICATE CHECK
  let duplicateRisk = false;
  
  if (invoiceData.invoice_number && invoiceData.issuer?.vat_id) {
    const { data: existing } = await supabase
      .from('invoices_received')
      .select('id')
      .eq('invoice_number', invoiceData.invoice_number)
      .eq('supplier_vat', invoiceData.issuer.vat_id)
      .neq('id', invoiceId)
      .maybeSingle();
    
    duplicateRisk = !!existing;
    
    if (duplicateRisk) {
      reasoning.push(`❌ Duplicate invoice: ${invoiceData.invoice_number}`);
    } else {
      reasoning.push(`✅ No duplicate`);
    }
  }
  
  // 8. FINAL DECISION
  const criteria: AutoPostingCriteria = {
    ocr_confidence: ocrConfidence,
    mapping_confidence: mappingConfidence,
    validation_errors: validationErrors,
    supplier_trusted: supplierTrusted,
    amount_anomaly: amountAnomaly,
    has_critical_fields: hasCriticalFields,
    duplicate_risk: duplicateRisk,
  };
  
  const canAutoPost = 
    ocrPass &&
    mappingPass &&
    validationPass &&
    hasCriticalFields &&
    supplierTrusted &&
    !amountAnomaly &&
    !duplicateRisk &&
    overallConfidence >= THRESHOLDS.OVERALL_CONFIDENCE_MIN;
  
  let recommendation: 'auto_post' | 'manual_review' | 'reject' = 'manual_review';
  
  if (canAutoPost) {
    recommendation = 'auto_post';
    reasoning.push(`\n🎯 AUTO-POST (${overallConfidence}%)`);
  } else if (duplicateRisk) {
    recommendation = 'reject';
    reasoning.push(`\n⛔ REJECT (duplicate)`);
  } else {
    recommendation = 'manual_review';
    reasoning.push(`\n👁️ MANUAL REVIEW (${overallConfidence}%)`);
  }
  
  return {
    can_auto_post: canAutoPost,
    confidence_score: overallConfidence,
    criteria_met: criteria,
    reasoning,
    recommendation,
  };
}

export async function executeAutoPost(
  invoiceId: string,
  supabase: any
): Promise<{ success: boolean; error?: string }> {
  
  try {
    await supabase
      .from('invoices_received')
      .update({
        approval_status: 'approved_accounting',
        auto_posted: true,
      })
      .eq('id', invoiceId);
    
    console.log(`[Auto-Post] Invoice ${invoiceId} auto-approved`);
    
    return { success: true };
    
  } catch (error) {
    console.error(`[Auto-Post] Error:`, error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}
