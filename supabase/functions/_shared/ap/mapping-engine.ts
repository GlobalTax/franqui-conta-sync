// ============================================================================
// AP MAPPING ENGINE - Account suggestions for invoices
// ============================================================================

import type { EnhancedInvoiceData } from "../ocr/types.ts";

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

// ============================================================================
// VALIDACIÓN DE CUENTAS PGC
// ============================================================================

async function validateAccountExists(
  supabase: any,
  accountCode: string,
  centroCode?: string | null
): Promise<boolean> {
  const query = supabase
    .from('accounts')
    .select('id')
    .eq('code', accountCode)
    .eq('active', true);
  
  if (centroCode) {
    query.eq('centro_code', centroCode);
  }
  
  const { data, error } = await query.maybeSingle();
  
  if (error) {
    console.error(`Error validating account ${accountCode}:`, error);
    return false;
  }
  
  return !!data;
}

async function validateAndAdjustSuggestion(
  supabase: any,
  suggestion: APMappingSuggestion,
  centroCode?: string | null
): Promise<APMappingSuggestion> {
  const accountValid = await validateAccountExists(
    supabase, 
    suggestion.account_suggestion,
    centroCode
  );
  
  const taxAccountValid = await validateAccountExists(
    supabase,
    suggestion.tax_account,
    centroCode
  );
  
  const apAccountValid = await validateAccountExists(
    supabase,
    suggestion.ap_account,
    centroCode
  );
  
  if (!accountValid || !taxAccountValid || !apAccountValid) {
    const invalidAccounts = [];
    if (!accountValid) invalidAccounts.push(`Gasto:${suggestion.account_suggestion}`);
    if (!taxAccountValid) invalidAccounts.push(`IVA:${suggestion.tax_account}`);
    if (!apAccountValid) invalidAccounts.push(`Proveedor:${suggestion.ap_account}`);
    
    return {
      ...suggestion,
      confidence_score: 10,
      rationale: `⚠️ ${suggestion.rationale} | ADVERTENCIA: Cuenta(s) no encontrada(s) en PGC: ${invalidAccounts.join(', ')}`
    };
  }
  
  return suggestion;
}

// ============================================================================
// MOTOR DE MAPEO AP
// ============================================================================

export async function apMapperEngine(
  normalizedData: EnhancedInvoiceData,
  supabase: any,
  supplierData: any | null
): Promise<APMappingResult> {
  
  const rules = await loadAPMappingRules(supabase);
  
  let invoiceSuggestion: APMappingSuggestion = {
    account_suggestion: '6290000',
    tax_account: '4720000',
    ap_account: '4100000',
    centre_id: null,
    confidence_score: 30,
    rationale: 'Sin regla específica, cuenta genérica asignada',
    matched_rule_id: null,
    matched_rule_name: null
  };
  
  // NUEVO: Aplicar patrones aprendidos PRIMERO
  if (supplierData?.id) {
    try {
      const { applyLearnedPatterns } = await import("../automation/learning-engine.ts");
      const learnedPattern = await applyLearnedPatterns(
        supplierData.id,
        normalizedData.totals?.total || 0,
        supabase
      );
      
      if (learnedPattern) {
        invoiceSuggestion = {
          ...invoiceSuggestion,
          account_suggestion: learnedPattern.account_suggestion,
          tax_account: learnedPattern.tax_account,
          ap_account: learnedPattern.ap_account,
          confidence_score: learnedPattern.confidence_score,
          rationale: learnedPattern.rationale,
          matched_rule_name: 'Machine Learning',
        };
        console.log('[AP Mapper] Applied learned pattern:', learnedPattern);
      }
    } catch (err) {
      console.error('[AP Mapper] Learning pattern error:', err);
    }
  }
  
  // Check supplier default account
  if (supplierData?.default_account_code) {
    invoiceSuggestion = {
      account_suggestion: supplierData.default_account_code,
      tax_account: '4720000',
      ap_account: '4100000',
      centre_id: null,
      confidence_score: 95,
      rationale: `Cuenta por defecto del proveedor: ${supplierData.name}`,
      matched_rule_id: null,
      matched_rule_name: 'Proveedor Maestro'
    };
  }
  
  // Apply rules by priority
  for (const rule of rules) {
    if (matchRule(rule, normalizedData, supplierData)) {
      invoiceSuggestion = {
        account_suggestion: rule.suggested_expense_account,
        tax_account: rule.suggested_tax_account,
        ap_account: rule.suggested_ap_account,
        centre_id: rule.suggested_centre_id,
        confidence_score: rule.confidence_score,
        rationale: rule.rationale,
        matched_rule_id: rule.id,
        matched_rule_name: rule.rule_name
      };
      break;
    }
  }
  
  // Validate invoice-level suggestion
  invoiceSuggestion = await validateAndAdjustSuggestion(
    supabase,
    invoiceSuggestion,
    normalizedData.centre_hint
  );
  
  // Line-level suggestions
  const lineSuggestions: APMappingSuggestion[] = [];
  for (const line of normalizedData.lines) {
    let lineSuggestion: APMappingSuggestion | null = null;
    
    for (const rule of rules) {
      if (rule.match_type === 'text_keywords' && rule.text_keywords) {
        const lineTextLower = line.description.toLowerCase();
        const matchesKeyword = rule.text_keywords.some((kw: string) => 
          lineTextLower.includes(kw.toLowerCase())
        );
        
        if (matchesKeyword) {
          lineSuggestion = {
            account_suggestion: rule.suggested_expense_account,
            tax_account: rule.suggested_tax_account,
            ap_account: rule.suggested_ap_account,
            centre_id: rule.suggested_centre_id,
            confidence_score: rule.confidence_score,
            rationale: `${rule.rationale} (línea)`,
            matched_rule_id: rule.id,
            matched_rule_name: rule.rule_name
          };
          break;
        }
      }
    }
    
    if (!lineSuggestion) {
      lineSuggestion = {
        ...invoiceSuggestion,
        rationale: `Heredado de factura: ${invoiceSuggestion.rationale}`
      };
    }
    
    // Validate line-level suggestion
    const validatedLineSuggestion = await validateAndAdjustSuggestion(
      supabase,
      lineSuggestion,
      normalizedData.centre_hint
    );
    
    lineSuggestions.push(validatedLineSuggestion);
  }
  
  return {
    invoice_level: invoiceSuggestion,
    line_level: lineSuggestions
  };
}

async function loadAPMappingRules(supabase: any) {
  const { data, error } = await supabase
    .from('ap_mapping_rules')
    .select('*')
    .eq('active', true)
    .order('priority', { ascending: false });
  
  if (error) {
    console.error('Error loading AP mapping rules:', error);
    return [];
  }
  
  return data || [];
}

function matchRule(rule: any, invoiceData: EnhancedInvoiceData, supplierData: any | null): boolean {
  switch (rule.match_type) {
    case 'supplier_exact':
      return supplierData?.id === rule.supplier_id;
    
    case 'supplier_tax_id':
      return invoiceData.issuer.vat_id?.toUpperCase() === rule.supplier_tax_id?.toUpperCase();
    
    case 'supplier_name_like':
      if (!rule.supplier_name_pattern) return false;
      const pattern = rule.supplier_name_pattern.replace(/%/g, '.*').toLowerCase();
      const regex = new RegExp(pattern);
      return regex.test(invoiceData.issuer.name.toLowerCase());
    
    case 'text_keywords':
      if (!rule.text_keywords || rule.text_keywords.length === 0) return false;
      const allText = invoiceData.lines.map(l => l.description.toLowerCase()).join(' ');
      
      const matchedKeywords = rule.text_keywords.filter((kw: string) => 
        allText.includes(kw.toLowerCase())
      );
      
      if (matchedKeywords.length === 0) return false;
      
      const confidenceBoost = Math.min(20, matchedKeywords.length * 10);
      rule.confidence_score = Math.min(100, rule.confidence_score + confidenceBoost);
      
      return true;
    
    case 'amount_range':
      const total = Math.abs(invoiceData.totals.total);
      if (rule.amount_min !== null && total < rule.amount_min) return false;
      if (rule.amount_max !== null && total > rule.amount_max) return false;
      return true;
    
    case 'centre_code':
      return invoiceData.centre_hint === rule.centro_code;
    
    case 'combined':
      let match = true;
      
      if (rule.supplier_id) {
        match = match && (supplierData?.id === rule.supplier_id);
      }
      
      if (rule.supplier_name_pattern) {
        const pattern = rule.supplier_name_pattern.replace(/%/g, '.*').toLowerCase();
        const regex = new RegExp(pattern);
        match = match && regex.test(invoiceData.issuer.name.toLowerCase());
      }
      
      if (rule.text_keywords && rule.text_keywords.length > 0) {
        const allText = invoiceData.lines.map(l => l.description.toLowerCase()).join(' ');
        const hasKeyword = rule.text_keywords.some((kw: string) => 
          allText.includes(kw.toLowerCase())
        );
        match = match && hasKeyword;
      }
      
      if (rule.amount_min !== null || rule.amount_max !== null) {
        const total = Math.abs(invoiceData.totals.total);
        if (rule.amount_min !== null) match = match && (total >= rule.amount_min);
        if (rule.amount_max !== null) match = match && (total <= rule.amount_max);
      }
      
      if (rule.centro_code) {
        match = match && (invoiceData.centre_hint === rule.centro_code);
      }
      
      return match;
    
    default:
      return false;
  }
}

export async function matchSupplier(supabase: any, supplierData: any, centroCode: string) {
  if (!supplierData.taxId) {
    return null;
  }

  const { data: exactMatch } = await supabase
    .from('suppliers')
    .select('id, name, tax_id, default_account_code')
    .eq('tax_id', supplierData.taxId)
    .eq('active', true)
    .maybeSingle();

  if (exactMatch) {
    return exactMatch;
  }

  return null;
}
