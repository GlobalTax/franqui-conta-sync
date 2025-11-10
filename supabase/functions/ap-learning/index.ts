import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Threshold híbrido: >= 85% auto-aprueba, < 85% revisión manual
const AUTO_APPROVE_THRESHOLD = 85;
const MANUAL_REVIEW_THRESHOLD = 70;

interface LearningRequest {
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);

    if (!user) {
      throw new Error('Unauthorized');
    }

    const learningData: LearningRequest = await req.json();

    console.log('[AP Learning] Processing corrections for invoice:', learningData.invoiceId);

    const corrections: any[] = [];
    const newRules: any[] = [];

    for (const line of learningData.lines) {
      // Detectar si hay corrección
      if (line.suggestedAccount === line.correctedAccount) {
        console.log(`[AP Learning] Line ${line.lineId}: No correction (accepted suggestion)`);
        continue;
      }

      console.log(`[AP Learning] Line ${line.lineId}: Correction detected`);
      console.log(`  Suggested: ${line.suggestedAccount} → Corrected: ${line.correctedAccount}`);

      // Extraer keywords relevantes de la descripción
      const keywords = extractKeywords(line.description);
      console.log(`  Extracted keywords:`, keywords);

      // Registrar la corrección
      const correction = {
        invoice_id: learningData.invoiceId,
        invoice_line_id: line.lineId,
        supplier_id: learningData.supplierId,
        line_description: line.description,
        line_amount: line.amount,
        suggested_account: line.suggestedAccount,
        corrected_account: line.correctedAccount,
        suggested_rule_id: line.suggestedRuleId,
        suggested_confidence: line.suggestedConfidence,
        extracted_keywords: keywords,
        supplier_name: learningData.supplierName,
        supplier_tax_id: learningData.supplierTaxId,
        centro_code: learningData.centroCode,
        created_by: user.id
      };

      corrections.push(correction);

      // Generar regla automática
      const rule = await generateRule(
        correction,
        learningData.supplierId,
        learningData.supplierName,
        learningData.supplierTaxId,
        user.id
      );

      if (rule) {
        newRules.push(rule);
      }
    }

    // Guardar correcciones en batch
    if (corrections.length > 0) {
      const { data: savedCorrections, error: correctionsError } = await supabase
        .from('ap_learning_corrections')
        .insert(corrections)
        .select();

      if (correctionsError) {
        console.error('[AP Learning] Error saving corrections:', correctionsError);
        throw correctionsError;
      }

      console.log(`[AP Learning] Saved ${savedCorrections.length} corrections`);

      // Guardar reglas generadas
      if (newRules.length > 0) {
        const { data: savedRules, error: rulesError } = await supabase
          .from('ap_mapping_rules')
          .insert(newRules)
          .select();

        if (rulesError) {
          console.error('[AP Learning] Error saving rules:', rulesError);
          throw rulesError;
        }

        console.log(`[AP Learning] Generated ${savedRules.length} new rules`);

        // Vincular reglas generadas a correcciones
        for (let i = 0; i < savedCorrections.length; i++) {
          if (savedRules[i]) {
            await supabase
              .from('ap_learning_corrections')
              .update({ 
                generated_rule_id: savedRules[i].id,
                rule_status: savedRules[i].confidence_score >= AUTO_APPROVE_THRESHOLD ? 'approved' : 'pending'
              })
              .eq('id', savedCorrections[i].id);
          }
        }

        return new Response(
          JSON.stringify({
            success: true,
            corrections: savedCorrections.length,
            rulesGenerated: savedRules.length,
            autoApproved: savedRules.filter((r: any) => r.confidence_score >= AUTO_APPROVE_THRESHOLD).length,
            rules: savedRules
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          }
        );
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        corrections: corrections.length,
        rulesGenerated: 0,
        message: 'No significant corrections to learn from'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error: any) {
    console.error('[AP Learning] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Extrae keywords relevantes de la descripción de una línea
 */
function extractKeywords(description: string): string[] {
  const text = description.toLowerCase();
  
  // Lista de keywords comunes en facturas españolas
  const relevantKeywords = [
    'papel', 'packaging', 'embalaje', 'bolsa', 'caja', 'envase',
    'electricidad', 'agua', 'gas', 'telefono', 'internet',
    'limpieza', 'mantenimiento', 'reparacion',
    'marketing', 'publicidad', 'diseño',
    'transporte', 'mensajeria', 'envio',
    'alquiler', 'arrendamiento', 'lease',
    'seguro', 'insurance',
    'formacion', 'curso', 'training',
    'software', 'licencia', 'suscripcion',
    'combustible', 'gasoil', 'diesel',
    'consultor', 'asesoria', 'auditoria'
  ];

  const found: string[] = [];
  
  for (const keyword of relevantKeywords) {
    if (text.includes(keyword)) {
      found.push(keyword);
    }
  }

  return found;
}

/**
 * Genera una regla automática basada en la corrección del usuario
 * Implementa threshold híbrido: >= 85% auto-aprueba, < 85% revisión manual
 */
async function generateRule(
  correction: any,
  supplierId: string | null,
  supplierName: string,
  supplierTaxId: string | null,
  userId: string
): Promise<any | null> {
  
  // Determinar el mejor match_type
  let matchType: string;
  let priority: number;
  let confidence: number;
  let rationale: string;

  // Estrategia 1: Si hay proveedor identificado + keywords → 'combined' (más específico)
  if (supplierId && correction.extracted_keywords.length > 0) {
    matchType = 'combined';
    priority = 95;
    confidence = 85;
    rationale = `Aprendido de corrección: ${supplierName} + keywords [${correction.extracted_keywords.join(', ')}]`;
    
    return {
      rule_name: `[Auto] ${supplierName} - ${correction.corrected_account}`,
      description: `Regla generada automáticamente de corrección manual`,
      match_type: matchType,
      supplier_id: supplierId,
      text_keywords: correction.extracted_keywords,
      suggested_expense_account: correction.corrected_account,
      suggested_tax_account: '4720000',
      suggested_ap_account: '4100000',
      confidence_score: confidence,
      rationale: rationale,
      priority: priority,
      active: true,
      created_by: userId
    };
  }

  // Estrategia 2: Si hay proveedor identificado → 'supplier_exact'
  if (supplierId) {
    matchType = 'supplier_exact';
    priority = 90;
    confidence = 90;
    rationale = `Aprendido de corrección: Proveedor ${supplierName} → ${correction.corrected_account}`;
    
    return {
      rule_name: `[Auto] ${supplierName}`,
      description: `Regla generada automáticamente de corrección manual`,
      match_type: matchType,
      supplier_id: supplierId,
      suggested_expense_account: correction.corrected_account,
      suggested_tax_account: '4720000',
      suggested_ap_account: '4100000',
      confidence_score: confidence,
      rationale: rationale,
      priority: priority,
      active: true,
      created_by: userId
    };
  }

  // Estrategia 3: Si hay keywords relevantes → 'text_keywords'
  if (correction.extracted_keywords.length > 0) {
    matchType = 'text_keywords';
    priority = 80;
    confidence = 75;
    rationale = `Aprendido de corrección: Keywords [${correction.extracted_keywords.join(', ')}] → ${correction.corrected_account}`;
    
    return {
      rule_name: `[Auto] Keywords: ${correction.extracted_keywords.join(', ')}`,
      description: `Regla generada automáticamente de corrección manual`,
      match_type: matchType,
      text_keywords: correction.extracted_keywords,
      suggested_expense_account: correction.corrected_account,
      suggested_tax_account: '4720000',
      suggested_ap_account: '4100000',
      confidence_score: confidence,
      rationale: rationale,
      priority: priority,
      active: true,
      created_by: userId
    };
  }

  // Estrategia 4: Si nada de lo anterior, usar supplier_name_like
  if (supplierName) {
    matchType = 'supplier_name_like';
    priority = 75;
    confidence = 70;
    rationale = `Aprendido de corrección: Nombre proveedor similar a "${supplierName}"`;
    
    return {
      rule_name: `[Auto] ${supplierName.substring(0, 30)}...`,
      description: `Regla generada automáticamente de corrección manual`,
      match_type: matchType,
      supplier_name_pattern: `%${supplierName.substring(0, 15)}%`,
      suggested_expense_account: correction.corrected_account,
      suggested_tax_account: '4720000',
      suggested_ap_account: '4100000',
      confidence_score: confidence,
      rationale: rationale,
      priority: priority,
      active: true,
      created_by: userId
    };
  }

  // Si no hay información suficiente, no generar regla
  console.log('[AP Learning] Insufficient context to generate rule');
  return null;
}
