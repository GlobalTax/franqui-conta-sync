// ============================================================================
// INVOICE OCR - Enhanced with Multi-Engine Orchestrator + Fiscal Normalizer ES + AP Mapping Engine
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";
import { orchestrateOCR } from "./orchestrator.ts";

const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGIN") || "*")
  .split(",")
  .map(o => o.trim());

const COMPANY_VAT_IDS = ['B12345678', 'B87654321']; // NIFs de nuestra empresa

// ============================================================================
// INTERFACES
// ============================================================================

interface EnhancedInvoiceData {
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
}

interface NormalizedResponse {
  normalized: EnhancedInvoiceData;
  validation: {
    ok: boolean;
    errors: string[];
    warnings: string[];
  };
  autofix_applied: string[];
}

interface APMappingSuggestion {
  account_suggestion: string;
  tax_account: string;
  ap_account: string;
  centre_id: string | null;
  confidence_score: number;
  rationale: string;
  matched_rule_id: string | null;
  matched_rule_name: string | null;
}

interface APMappingResult {
  invoice_level: APMappingSuggestion;
  line_level: APMappingSuggestion[];
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req) => {
  const requestOrigin = req.headers.get("origin") || "";
  const corsHeaders = {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes("*") 
      ? "*" 
      : (ALLOWED_ORIGINS.includes(requestOrigin) ? requestOrigin : ALLOWED_ORIGINS[0]),
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const { documentPath, centroCode } = await req.json();
    
    if (!documentPath || !centroCode) {
      throw new Error('documentPath and centroCode are required');
    }

    console.log(`Processing OCR for document: ${documentPath}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Download PDF
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('invoice-documents')
      .download(documentPath);

    if (downloadError) {
      throw new Error(`Failed to download file: ${downloadError.message}`);
    }

    // Convert to base64
    const arrayBuffer = await fileData.arrayBuffer();
    const base64Content = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    console.log('Starting OCR orchestration...');

    // ⭐ NUEVO: Usar Orchestrator en lugar de Google Vision directo
    const orchestratorResult = await orchestrateOCR(
      base64Content,
      fileData.type || 'application/pdf',
      centroCode
    );

    console.log(`[Main] OCR Engine used: ${orchestratorResult.ocr_engine}`);
    console.log(`[Main] Confidence: ${orchestratorResult.confidence_final}%`);
    
    // 2. Match supplier
    const matchedSupplier = await matchSupplier(supabase, {
      name: orchestratorResult.final_invoice_json.issuer.name,
      taxId: orchestratorResult.final_invoice_json.issuer.vat_id
    }, centroCode);

    // 3. Fiscal Normalizer ES
    const normalizedResponse = fiscalNormalizerES(orchestratorResult.final_invoice_json, '', COMPANY_VAT_IDS);
    
    // 4. AP Mapping Engine
    const apMapping = await apMapperEngine(
      normalizedResponse.normalized,
      supabase,
      matchedSupplier
    );

    // 5. Invoice Entry Validator
    const entryValidation = validateInvoiceEntry({
      normalized_invoice: normalizedResponse.normalized,
      ap_mapping: apMapping,
      centro_code: centroCode
    });

    const processingTime = Date.now() - startTime;

    console.log(`OCR completed in ${processingTime}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        ocr_engine: orchestratorResult.ocr_engine, // ⭐ Nuevo
        merge_notes: orchestratorResult.merge_notes, // ⭐ Nuevo
        data: normalizedResponse.normalized,
        normalized: normalizedResponse.normalized,
        validation: normalizedResponse.validation,
        autofix_applied: normalizedResponse.autofix_applied,
        ap_mapping: apMapping,
        entry_validation: entryValidation,
        confidence: orchestratorResult.confidence_final / 100,
        rawText: '',
        processingTimeMs: processingTime
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error: any) {
    console.error('OCR processing error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || 'Unknown error occurred',
        processingTimeMs: Date.now() - startTime
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

// ============================================================================
// EXTRACCIÓN DE DATOS (Mejorada)
// ============================================================================

function extractInvoiceData(text: string): EnhancedInvoiceData {
  const lines = text.split('\n');
  
  // Detect document type
  const documentType = detectDocumentType(text);
  
  // Extract tax ID
  const taxIdMatch = text.match(/\b([A-Z]\d{8}|[A-Z]\d{7}[A-Z]|\d{8}[A-Z])\b/i);
  const taxId = taxIdMatch ? taxIdMatch[1].toUpperCase() : '';

  // Extract supplier name
  const taxIdIndex = lines.findIndex(line => line.includes(taxId));
  let supplierName = '';
  if (taxIdIndex > 0) {
    for (let i = Math.max(0, taxIdIndex - 5); i < taxIdIndex; i++) {
      const line = lines[i].trim();
      if (line.length > 3 && !line.match(/\d{5,}/) && !line.match(/factura|invoice/i)) {
        supplierName = line;
        break;
      }
    }
  }

  // Extract invoice number
  const invoiceNumberMatch = text.match(/(?:factura|invoice|n[ºo°]\.?|#)\s*:?\s*([\w\/-]+)/i);
  const invoiceNumber = invoiceNumberMatch ? invoiceNumberMatch[1].trim() : '';

  // Extract dates
  const dateMatches = [...text.matchAll(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/g)];
  const invoiceDate = dateMatches[0] ? formatDate(dateMatches[0][3], dateMatches[0][2], dateMatches[0][1]) : '';
  const dueDate = dateMatches[1] ? formatDate(dateMatches[1][3], dateMatches[1][2], dateMatches[1][1]) : null;

  // Extract total
  let total = 0;
  const totalMatch = text.match(/(?:total|importe\s*total)\s*:?\s*(\d{1,3}(?:\.\d{3})*,\d{2})/i);
  if (totalMatch) {
    total = parseSpanishAmount(totalMatch[1]);
  }

  // Extract VAT breakdown
  const vatBreakdown = extractVATBreakdown(text, total);

  // Parse lines
  const invoiceLines: EnhancedInvoiceData['lines'] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineMatch = line.match(/^(.+?)\s+(\d+(?:,\d+)?)\s+(\d{1,3}(?:\.\d{3})*,\d{2})\s+(\d{1,3}(?:\.\d{3})*,\d{2})$/);
    if (lineMatch) {
      invoiceLines.push({
        description: lineMatch[1].trim(),
        quantity: parseFloat(lineMatch[2].replace(',', '.')),
        unit_price: parseSpanishAmount(lineMatch[3]),
        amount: parseSpanishAmount(lineMatch[4])
      });
    }
  }

  if (invoiceLines.length === 0 && total > 0) {
    const subtotal = (vatBreakdown.base_10 || 0) + (vatBreakdown.base_21 || 0);
    invoiceLines.push({
      description: 'Concepto general',
      quantity: 1,
      unit_price: subtotal > 0 ? subtotal : total * 0.8,
      amount: subtotal > 0 ? subtotal : total * 0.8
    });
  }

  return {
    document_type: documentType,
    issuer: {
      name: supplierName,
      vat_id: taxId || null
    },
    receiver: {
      name: null,
      vat_id: null,
      address: null
    },
    invoice_number: invoiceNumber,
    issue_date: invoiceDate,
    due_date: dueDate,
    totals: {
      currency: 'EUR',
      ...vatBreakdown,
      total
    },
    lines: invoiceLines,
    centre_hint: null,
    payment_method: null,
    confidence_notes: [],
    confidence_score: 0,
    discrepancies: [],
    proposed_fix: null
  };
}

function detectDocumentType(text: string): "invoice" | "credit_note" | "ticket" {
  const lowerText = text.toLowerCase();
  
  const creditNoteKeywords = ['abono', 'nota de crédito', 'rectificativa', 'devolución'];
  if (creditNoteKeywords.some(kw => lowerText.includes(kw))) {
    return 'credit_note';
  }
  
  const ticketKeywords = ['ticket', 'comprobante simplificado', 'tique'];
  if (ticketKeywords.some(kw => lowerText.includes(kw))) {
    return 'ticket';
  }
  
  return 'invoice';
}

function extractVATBreakdown(text: string, total: number) {
  const result = {
    base_10: null as number | null,
    vat_10: null as number | null,
    base_21: null as number | null,
    vat_21: null as number | null,
    other_taxes: [] as Array<{ type: string; base: number; quota: number }>
  };

  // IVA 21%
  const vat21BaseMatch = text.match(/base\s*(?:imponible)?\s*(?:al?\s*)?21%?[:\s]*(\d{1,3}(?:\.\d{3})*,\d{2})/i);
  if (vat21BaseMatch) {
    result.base_21 = parseSpanishAmount(vat21BaseMatch[1]);
  }

  const vat21QuotaMatch = text.match(/i\.?v\.?a\.?\s*(?:\()?\s*21%?\s*(?:\))?[:\s]*(\d{1,3}(?:\.\d{3})*,\d{2})/i);
  if (vat21QuotaMatch) {
    result.vat_21 = parseSpanishAmount(vat21QuotaMatch[1]);
  }

  if (result.base_21 !== null && result.vat_21 === null) {
    result.vat_21 = Math.round(result.base_21 * 0.21 * 100) / 100;
  } else if (result.base_21 === null && result.vat_21 !== null) {
    result.base_21 = Math.round((result.vat_21 / 0.21) * 100) / 100;
  }

  // IVA 10%
  const vat10BaseMatch = text.match(/base\s*(?:imponible)?\s*(?:al?\s*)?10%?[:\s]*(\d{1,3}(?:\.\d{3})*,\d{2})/i);
  if (vat10BaseMatch) {
    result.base_10 = parseSpanishAmount(vat10BaseMatch[1]);
  }

  const vat10QuotaMatch = text.match(/i\.?v\.?a\.?\s*(?:\()?\s*10%?\s*(?:\))?[:\s]*(\d{1,3}(?:\.\d{3})*,\d{2})/i);
  if (vat10QuotaMatch) {
    result.vat_10 = parseSpanishAmount(vat10QuotaMatch[1]);
  }

  if (result.base_10 !== null && result.vat_10 === null) {
    result.vat_10 = Math.round(result.base_10 * 0.10 * 100) / 100;
  } else if (result.base_10 === null && result.vat_10 !== null) {
    result.base_10 = Math.round((result.vat_10 / 0.10) * 100) / 100;
  }

  return result;
}

// ============================================================================
// VALIDACIÓN NIF/CIF
// ============================================================================

function validateSpanishVAT(vat: string | null): boolean {
  if (!vat) return false;
  
  const cleanVAT = vat.toUpperCase().replace(/[\s\-\.]/g, '');
  if (cleanVAT.length !== 9) return false;
  
  const firstChar = cleanVAT[0];
  
  // NIF/NIE validation
  if (/^[XYZ0-9]/.test(firstChar)) {
    const nieMap: { [key: string]: string } = { X: '0', Y: '1', Z: '2' };
    const numPart = nieMap[firstChar] 
      ? nieMap[firstChar] + cleanVAT.slice(1, 8) 
      : cleanVAT.slice(0, 8);
    
    if (!/^\d{8}$/.test(numPart)) return false;
    
    const letter = 'TRWAGMYFPDXBNJZSQVHLCKE'[parseInt(numPart) % 23];
    return letter === cleanVAT[8];
  }
  
  // CIF validation
  if (/^[ABCDEFGHJNPQRSUVW]/.test(firstChar)) {
    const numPart = cleanVAT.slice(1, 8);
    const controlChar = cleanVAT[8];
    
    if (!/^\d{7}$/.test(numPart)) return false;
    
    let sum = 0;
    for (let i = 0; i < 7; i++) {
      const digit = parseInt(numPart[i]);
      if (i % 2 === 0) {
        const doubled = digit * 2;
        sum += Math.floor(doubled / 10) + (doubled % 10);
      } else {
        sum += digit;
      }
    }
    
    const unitDigit = sum % 10;
    const controlDigit = unitDigit === 0 ? 0 : 10 - unitDigit;
    const controlLetter = 'JABCDEFGHI'[controlDigit];
    
    return controlChar === String(controlDigit) || controlChar === controlLetter;
  }
  
  return false;
}

// ============================================================================
// NORMALIZADOR FISCAL ES
// ============================================================================

function fiscalNormalizerES(
  extractedData: EnhancedInvoiceData,
  rawText: string,
  companyVATIds: string[]
): NormalizedResponse {
  
  const normalized = JSON.parse(JSON.stringify(extractedData));
  const autofixApplied: string[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  // Migrar IVA de other_taxes a campos específicos
  const remainingOtherTaxes: typeof normalized.totals.other_taxes = [];
  
  for (const tax of normalized.totals.other_taxes) {
    if (tax.type.includes('21%') || tax.type.includes('21')) {
      if (normalized.totals.base_21 === null) {
        normalized.totals.base_21 = tax.base;
        normalized.totals.vat_21 = tax.quota;
        autofixApplied.push(`migrar-iva-21-from-other: base ${tax.base}€, cuota ${tax.quota}€`);
      }
    } else if (tax.type.includes('10%') || tax.type.includes('10')) {
      if (normalized.totals.base_10 === null) {
        normalized.totals.base_10 = tax.base;
        normalized.totals.vat_10 = tax.quota;
        autofixApplied.push(`migrar-iva-10-from-other: base ${tax.base}€, cuota ${tax.quota}€`);
      }
    } else {
      remainingOtherTaxes.push(tax);
    }
  }
  
  normalized.totals.other_taxes = remainingOtherTaxes;

  // Validar y corregir cálculos de IVA
  if (normalized.totals.base_21 !== null && normalized.totals.vat_21 !== null) {
    const expectedVAT21 = Math.round(normalized.totals.base_21 * 0.21 * 100) / 100;
    const diff = Math.abs(expectedVAT21 - normalized.totals.vat_21);
    
    if (diff > 0.01 && diff < 1.0) {
      normalized.totals.vat_21 = expectedVAT21;
      autofixApplied.push(`ajustar-redondeo-iva-21: ${normalized.totals.vat_21}€ → ${expectedVAT21}€`);
    }
  }

  if (normalized.totals.base_10 !== null && normalized.totals.vat_10 !== null) {
    const expectedVAT10 = Math.round(normalized.totals.base_10 * 0.10 * 100) / 100;
    const diff = Math.abs(expectedVAT10 - normalized.totals.vat_10);
    
    if (diff > 0.01 && diff < 1.0) {
      normalized.totals.vat_10 = expectedVAT10;
      autofixApplied.push(`ajustar-redondeo-iva-10: ${normalized.totals.vat_10}€ → ${expectedVAT10}€`);
    }
  }

  // Validar totales
  const sumComponents = 
    (normalized.totals.base_10 || 0) + 
    (normalized.totals.vat_10 || 0) + 
    (normalized.totals.base_21 || 0) + 
    (normalized.totals.vat_21 || 0);
  
  const totalDiff = Math.abs(sumComponents - normalized.totals.total);
  
  if (totalDiff > 0.01 && totalDiff < 1.0) {
    normalized.totals.total = Math.round(sumComponents * 100) / 100;
    autofixApplied.push(`ajustar-total: ${normalized.totals.total}€ → ${sumComponents.toFixed(2)}€`);
  } else if (totalDiff >= 1.0) {
    errors.push(`Total no cuadra: diferencia de ${totalDiff.toFixed(2)}€`);
  }

  // Validar NIF/CIF
  if (normalized.issuer.vat_id) {
    const isValid = validateSpanishVAT(normalized.issuer.vat_id);
    if (!isValid) {
      warnings.push(`NIF/CIF emisor inválido: ${normalized.issuer.vat_id}`);
    }
  } else {
    errors.push('NIF/CIF del emisor obligatorio');
  }

  // Inferir receiver si falta
  if (!normalized.receiver.vat_id) {
    for (const companyVAT of companyVATIds) {
      if (rawText.toUpperCase().includes(companyVAT.toUpperCase())) {
        normalized.receiver.vat_id = companyVAT;
        normalized.receiver.name = "Nuestra empresa";
        autofixApplied.push(`inferir-receiver: detectado NIF ${companyVAT} en texto`);
        break;
      }
    }
  }

  // Ajustar cantidades negativas para credit_note
  if (normalized.document_type === 'credit_note' && normalized.totals.total > 0) {
    normalized.totals.total = -normalized.totals.total;
    normalized.totals.base_10 = normalized.totals.base_10 ? -normalized.totals.base_10 : null;
    normalized.totals.vat_10 = normalized.totals.vat_10 ? -normalized.totals.vat_10 : null;
    normalized.totals.base_21 = normalized.totals.base_21 ? -normalized.totals.base_21 : null;
    normalized.totals.vat_21 = normalized.totals.vat_21 ? -normalized.totals.vat_21 : null;
    
    normalized.lines = normalized.lines.map((line: any) => ({
      ...line,
      amount: -Math.abs(line.amount)
    }));
    
    autofixApplied.push('invertir-signos-abono: cantidades convertidas a negativas');
  }

  // Calculate confidence
  const confidenceResult = calculateEnhancedConfidence(normalized);
  normalized.confidence_score = confidenceResult.score;
  normalized.confidence_notes = confidenceResult.notes;

  return {
    normalized,
    validation: {
      ok: errors.length === 0,
      errors,
      warnings
    },
    autofix_applied: autofixApplied
  };
}

function calculateEnhancedConfidence(data: EnhancedInvoiceData): { score: number; notes: string[] } {
  let score = 100;
  const notes: string[] = [];

  const calculatedTotal = 
    (data.totals.base_10 || 0) + 
    (data.totals.vat_10 || 0) + 
    (data.totals.base_21 || 0) + 
    (data.totals.vat_21 || 0);
  
  if (Math.abs(calculatedTotal - data.totals.total) > 0.01) {
    score -= 25;
    notes.push('Totales no cuadran (descuento -25)');
  }

  if (!validateSpanishVAT(data.issuer.vat_id)) {
    score -= 20;
    notes.push('NIF/CIF emisor inválido (descuento -20)');
  }

  if (!data.issue_date || !data.issue_date.match(/^\d{4}-\d{2}-\d{2}$/)) {
    score -= 15;
    notes.push('Fecha no fiable (descuento -15)');
  }

  if (data.lines.length === 0) {
    score -= 10;
    notes.push('Sin líneas de factura (descuento -10)');
  }

  if (!data.invoice_number || data.invoice_number.trim() === '') {
    score -= 5;
    notes.push('Número de factura vacío (descuento -5)');
  }

  return { score: Math.max(0, score), notes };
}

// ============================================================================
// MOTOR DE MAPEO AP
// ============================================================================

async function apMapperEngine(
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
  
  // Line-level suggestions
  const lineSuggestions: APMappingSuggestion[] = normalizedData.lines.map(line => {
    for (const rule of rules) {
      if (rule.match_type === 'text_keywords' && rule.text_keywords) {
        const lineTextLower = line.description.toLowerCase();
        const matchesKeyword = rule.text_keywords.some((kw: string) => 
          lineTextLower.includes(kw.toLowerCase())
        );
        
        if (matchesKeyword) {
          return {
            account_suggestion: rule.suggested_expense_account,
            tax_account: rule.suggested_tax_account,
            ap_account: rule.suggested_ap_account,
            centre_id: rule.suggested_centre_id,
            confidence_score: rule.confidence_score,
            rationale: `${rule.rationale} (línea)`,
            matched_rule_id: rule.id,
            matched_rule_name: rule.rule_name
          };
        }
      }
    }
    
    return {
      ...invoiceSuggestion,
      rationale: `Heredado de factura: ${invoiceSuggestion.rationale}`
    };
  });
  
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

// ============================================================================
// Motor de Mapeo AP - Plan General Contable Español
// ============================================================================
//
// Prioridad de aplicación:
// 1. Default genérico (6290000, confidence 30%)
// 2. Cuenta por defecto del proveedor (confidence 95%)
// 3. Reglas dinámicas por prioridad DESC (confidence según regla)
//
// Match Types soportados:
// - supplier_exact: UUID de proveedor
// - supplier_tax_id: NIF/CIF exacto
// - supplier_name_like: Pattern matching (%)
// - text_keywords: Array de palabras clave en líneas (con confidence dinámico)
// - amount_range: Min/max de monto total
// - centre_code: Código de centro específico
// - combined: Combinación AND de múltiples criterios
// ============================================================================

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
      
      // Count matched keywords for dynamic confidence
      const matchedKeywords = rule.text_keywords.filter((kw: string) => 
        allText.includes(kw.toLowerCase())
      );
      
      if (matchedKeywords.length === 0) return false;
      
      // Boost confidence: +10 per keyword match, max +20
      const confidenceBoost = Math.min(20, matchedKeywords.length * 10);
      rule.confidence_score = Math.min(100, rule.confidence_score + confidenceBoost);
      
      return true;
    
    case 'amount_range':
      const total = Math.abs(invoiceData.totals.total);
      if (rule.amount_min !== null && total < rule.amount_min) return false;
      if (rule.amount_max !== null && total > rule.amount_max) return false;
      return true;
    
    case 'centre_code':
      // Match por código de centro
      return invoiceData.centre_hint === rule.centro_code;
    
    case 'combined':
      // Lógica AND de múltiples criterios
      let match = true;
      
      // Check supplier_id
      if (rule.supplier_id) {
        match = match && (supplierData?.id === rule.supplier_id);
      }
      
      // Check supplier_name_pattern
      if (rule.supplier_name_pattern) {
        const pattern = rule.supplier_name_pattern.replace(/%/g, '.*').toLowerCase();
        const regex = new RegExp(pattern);
        match = match && regex.test(invoiceData.issuer.name.toLowerCase());
      }
      
      // Check text_keywords
      if (rule.text_keywords && rule.text_keywords.length > 0) {
        const allText = invoiceData.lines.map(l => l.description.toLowerCase()).join(' ');
        const hasKeyword = rule.text_keywords.some((kw: string) => 
          allText.includes(kw.toLowerCase())
        );
        match = match && hasKeyword;
      }
      
      // Check amount_range
      if (rule.amount_min !== null || rule.amount_max !== null) {
        const total = Math.abs(invoiceData.totals.total);
        if (rule.amount_min !== null) match = match && (total >= rule.amount_min);
        if (rule.amount_max !== null) match = match && (total <= rule.amount_max);
      }
      
      // Check centro_code
      if (rule.centro_code) {
        match = match && (invoiceData.centre_hint === rule.centro_code);
      }
      
      return match;
    
    default:
      return false;
  }
}

// ============================================================================
// SUPPLIER MATCHING
// ============================================================================

async function matchSupplier(supabase: any, supplierData: any, centroCode: string) {
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

// ============================================================================
// UTILITIES
// ============================================================================

function parseSpanishAmount(amount: string): number {
  return parseFloat(amount.replace(/\./g, '').replace(',', '.'));
}

function formatDate(year: string, month: string, day: string): string {
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

// ============================================================================
// INVOICE ENTRY VALIDATOR
// ============================================================================

interface EntryPreviewLine {
  account: string;
  account_name?: string;
  debit: number;
  credit: number;
  description: string;
  centre_id?: string;
  line_number: number;
}

interface InvoiceEntryValidationResult {
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

function validateInvoiceEntry(input: {
  normalized_invoice: EnhancedInvoiceData;
  ap_mapping: APMappingResult;
  centro_code: string;
}): InvoiceEntryValidationResult {
  
  const blockingIssues: string[] = [];
  const warnings: string[] = [];
  let confidenceScore = 100;
  
  // Validar campos obligatorios
  if (!input.normalized_invoice.issuer.vat_id) {
    blockingIssues.push('NIF/CIF del emisor es obligatorio');
    confidenceScore -= 30;
  }
  
  if (!input.normalized_invoice.invoice_number || input.normalized_invoice.invoice_number.trim() === '') {
    blockingIssues.push('Número de factura es obligatorio');
    confidenceScore -= 20;
  }
  
  if (!input.normalized_invoice.issue_date || !/^\d{4}-\d{2}-\d{2}$/.test(input.normalized_invoice.issue_date)) {
    blockingIssues.push('Fecha de emisión obligatoria (formato YYYY-MM-DD)');
    confidenceScore -= 20;
  }
  
  if (input.normalized_invoice.totals.total <= 0) {
    blockingIssues.push('El total de la factura debe ser mayor a 0');
    confidenceScore -= 25;
  }
  
  // Validar cálculos fiscales
  const totals = input.normalized_invoice.totals;
  const calculatedTotal = 
    (totals.base_10 || 0) + 
    (totals.vat_10 || 0) + 
    (totals.base_21 || 0) + 
    (totals.vat_21 || 0) + 
    totals.other_taxes.reduce((sum, t) => sum + t.base + t.quota, 0);
  
  const diff = Math.abs(calculatedTotal - totals.total);
  
  if (diff > 0.01) {
    blockingIssues.push(
      `Los totales no cuadran: calculado ${calculatedTotal.toFixed(2)}€, ` +
      `declarado ${totals.total.toFixed(2)}€ (diferencia: ${diff.toFixed(2)}€)`
    );
    confidenceScore -= 25;
  } else if (diff > 0.001 && diff <= 0.01) {
    warnings.push(`Pequeña diferencia de redondeo: ${diff.toFixed(3)}€`);
    confidenceScore -= 2;
  }
  
  // Validar sugerencias AP
  if (input.ap_mapping.invoice_level.confidence_score < 50) {
    warnings.push(
      'Baja confianza en la sugerencia de cuenta AP ' +
      `(${input.ap_mapping.invoice_level.confidence_score}%)`
    );
    confidenceScore -= 15;
  } else if (input.ap_mapping.invoice_level.confidence_score < 80) {
    warnings.push(
      'Confianza media en la sugerencia de cuenta AP ' +
      `(${input.ap_mapping.invoice_level.confidence_score}%)`
    );
    confidenceScore -= 10;
  }
  
  const expenseAccount = input.ap_mapping.invoice_level.account_suggestion;
  if (!expenseAccount || !expenseAccount.startsWith('6')) {
    blockingIssues.push(
      `Cuenta de gasto inválida: ${expenseAccount || 'vacía'} (debe ser 6xx)`
    );
    confidenceScore -= 20;
  }
  
  // Generar preview del asiento
  const preview: EntryPreviewLine[] = [];
  let lineNumber = 1;
  
  const isInvoice = input.normalized_invoice.document_type === 'invoice';
  
  // Gastos (Bases)
  const baseTotal = 
    (totals.base_10 || 0) + 
    (totals.base_21 || 0) + 
    totals.other_taxes.filter(t => !t.type.toLowerCase().includes('irpf')).reduce((sum, t) => sum + t.base, 0);
  
  if (baseTotal !== 0) {
    preview.push({
      account: expenseAccount,
      account_name: input.ap_mapping.invoice_level.rationale,
      debit: isInvoice ? baseTotal : 0,
      credit: isInvoice ? 0 : Math.abs(baseTotal),
      description: `Compras - ${input.normalized_invoice.issuer.name || 'Proveedor'}`,
      centre_id: input.ap_mapping.invoice_level.centre_id || undefined,
      line_number: lineNumber++
    });
  }
  
  // IVA Soportado
  const vatTotal = 
    (totals.vat_10 || 0) + 
    (totals.vat_21 || 0) + 
    totals.other_taxes.filter(t => !t.type.toLowerCase().includes('irpf')).reduce((sum, t) => sum + t.quota, 0);
  
  if (vatTotal !== 0) {
    preview.push({
      account: input.ap_mapping.invoice_level.tax_account,
      account_name: 'IVA Soportado',
      debit: isInvoice ? vatTotal : 0,
      credit: isInvoice ? 0 : Math.abs(vatTotal),
      description: 'IVA soportado',
      line_number: lineNumber++
    });
  }
  
  // IRPF si existe
  const irpfTaxes = totals.other_taxes.filter(t => t.type.toLowerCase().includes('irpf'));
  const irpfTotal = irpfTaxes.reduce((sum, t) => sum + t.quota, 0);
  
  if (irpfTotal !== 0) {
    preview.push({
      account: '4730000',
      account_name: 'HP retenciones practicadas',
      debit: isInvoice ? 0 : Math.abs(irpfTotal),
      credit: isInvoice ? irpfTotal : 0,
      description: 'IRPF retenido',
      line_number: lineNumber++
    });
  }
  
  // Proveedores
  const netPayable = totals.total - irpfTotal;
  preview.push({
    account: input.ap_mapping.invoice_level.ap_account,
    account_name: 'Proveedores',
    debit: isInvoice ? 0 : Math.abs(netPayable),
    credit: isInvoice ? netPayable : 0,
    description: `${input.normalized_invoice.issuer.name || 'Proveedor'} - ${input.normalized_invoice.invoice_number}`,
    line_number: lineNumber++
  });
  
  // Validar cuadre del preview
  const totalDebit = preview.reduce((sum, line) => sum + line.debit, 0);
  const totalCredit = preview.reduce((sum, line) => sum + line.credit, 0);
  const previewDiff = Math.abs(totalDebit - totalCredit);
  const previewBalanced = previewDiff < 0.01;
  
  if (!previewBalanced) {
    blockingIssues.push(
      `Preview del asiento no cuadrado: Debe ${totalDebit.toFixed(2)}€, ` +
      `Haber ${totalCredit.toFixed(2)}€ (diferencia: ${previewDiff.toFixed(2)}€)`
    );
    confidenceScore -= 30;
  }
  
  const readyToPost = blockingIssues.length === 0 && previewBalanced && confidenceScore >= 50;
  
  return {
    ready_to_post: readyToPost,
    blocking_issues: blockingIssues,
    warnings,
    confidence_score: Math.max(0, Math.min(100, confidenceScore)),
    post_preview: preview,
    validation_details: {
      invoice_data_valid: !blockingIssues.some(i => i.includes('obligatorio') || i.includes('formato')),
      totals_match: diff <= 0.01,
      ap_suggestions_valid: input.ap_mapping.invoice_level.confidence_score >= 50,
      preview_balanced: previewBalanced,
      fiscal_year_open: true
    }
  };
}
