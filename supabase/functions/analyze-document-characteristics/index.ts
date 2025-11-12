// ============================================================================
// ANALYZE DOCUMENT CHARACTERISTICS
// Intelligent OCR engine selector based on document analysis
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DocumentAnalysis {
  pages: number;
  quality_score: number;
  complexity: 'simple' | 'standard' | 'complex';
  estimated_text_density: number;
  is_scanned: boolean;
  recommended_engine: 'openai' | 'mindee';
  confidence: number;
  reasoning: string[];
  cost_comparison: {
    openai: number;
    mindee: number;
    savings_eur: number;
    savings_percent: number;
  };
  supplier_history?: {
    total: number;
    mindee: { count: number; avg_confidence: number };
    openai: { count: number; avg_confidence: number };
    preferred_engine: 'openai' | 'mindee';
  };
}

const ENGINE_COSTS = {
  openai_per_invoice: 0.08,
  mindee_per_page: 0.055
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { documentPath, supplierVatId } = await req.json();
    
    if (!documentPath) {
      throw new Error('documentPath is required');
    }

    console.log('[Analyzer] Processing:', documentPath);

    // Download PDF
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('invoice-documents')
      .download(documentPath);

    if (downloadError) {
      throw new Error(`Failed to download file: ${downloadError.message}`);
    }

    // ============================================================================
    // PHASE 1: Extract basic characteristics
    // ============================================================================
    
    const fileSize = fileData.size;
    const arrayBuffer = await fileData.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    
    // Extract page count from PDF (simple heuristic)
    let pageCount = 1;
    try {
      const pdfText = new TextDecoder().decode(bytes);
      const pageMatches = pdfText.match(/\/Type\s*\/Page[^s]/g);
      if (pageMatches) {
        pageCount = pageMatches.length;
      }
    } catch (e) {
      console.warn('[Analyzer] Could not extract page count, using 1');
    }

    // Estimate quality score (0-100)
    // Based on file size ratio (larger files = higher quality scans)
    const avgBytesPerPage = fileSize / pageCount;
    const qualityScore = Math.min(100, Math.max(40, (avgBytesPerPage / 150000) * 100));

    // Estimate text density (simple heuristic)
    const estimatedTextDensity = fileSize > 500000 ? 300 : 150; // words per page

    // Detect if scanned (heuristic: large file size = image-based PDF)
    const isScanned = avgBytesPerPage > 200000;

    // Determine complexity
    let complexity: 'simple' | 'standard' | 'complex' = 'standard';
    if (pageCount === 1 && !isScanned && qualityScore > 80) {
      complexity = 'simple';
    } else if (pageCount >= 3 || isScanned || qualityScore < 60) {
      complexity = 'complex';
    }

    console.log('[Analyzer] Characteristics:', { pageCount, qualityScore, complexity, isScanned });

    // ============================================================================
    // PHASE 2: Get supplier history (if available)
    // ============================================================================
    
    let supplierHistory = null;
    
    if (supplierVatId) {
      const { data: historyData } = await supabase
        .from('invoices_received')
        .select('ocr_engine, ocr_confidence_score')
        .eq('supplier_vat_id', supplierVatId)
        .gte('ocr_confidence_score', 70)
        .not('ocr_engine', 'is', null)
        .order('created_at', { ascending: false })
        .limit(10);

      if (historyData && historyData.length >= 3) {
        const mindeeInvoices = historyData.filter(i => i.ocr_engine === 'mindee');
        const openaiInvoices = historyData.filter(i => i.ocr_engine === 'openai');
        
        const mindeeAvg = mindeeInvoices.length > 0
          ? mindeeInvoices.reduce((sum, i) => sum + (i.ocr_confidence_score || 0), 0) / mindeeInvoices.length
          : 0;
        
        const openaiAvg = openaiInvoices.length > 0
          ? openaiInvoices.reduce((sum, i) => sum + (i.ocr_confidence_score || 0), 0) / openaiInvoices.length
          : 0;

        supplierHistory = {
          total: historyData.length,
          mindee: { count: mindeeInvoices.length, avg_confidence: mindeeAvg },
          openai: { count: openaiInvoices.length, avg_confidence: openaiAvg },
          preferred_engine: (mindeeAvg > openaiAvg ? 'mindee' : 'openai') as 'openai' | 'mindee'
        };

        console.log('[Analyzer] Supplier history:', supplierHistory);
      }
    }

    // ============================================================================
    // PHASE 3: Recommendation algorithm
    // ============================================================================
    
    const reasons: string[] = [];
    let scoreMindee = 50;
    let scoreOpenai = 50;

    // Factor 1: Page count & cost
    if (pageCount === 1) {
      scoreMindee += 20;
      reasons.push('✓ Documento de 1 página: Mindee más eficiente');
    } else if (pageCount >= 3) {
      const mindeeCost = pageCount * ENGINE_COSTS.mindee_per_page;
      if (mindeeCost > ENGINE_COSTS.openai_per_invoice) {
        scoreOpenai += 15;
        reasons.push(`✓ ${pageCount} páginas: OpenAI más económico (€${mindeeCost.toFixed(3)} vs €${ENGINE_COSTS.openai_per_invoice})`);
      }
    }

    // Factor 2: Quality
    if (qualityScore < 60) {
      scoreOpenai += 25;
      reasons.push(`✓ Calidad baja (${Math.round(qualityScore)}%): OpenAI mejor en documentos mal escaneados`);
    } else if (qualityScore > 85) {
      scoreMindee += 15;
      reasons.push(`✓ Calidad alta (${Math.round(qualityScore)}%): Mindee óptimo para documentos nítidos`);
    }

    // Factor 3: Complexity
    if (complexity === 'simple' || complexity === 'standard') {
      scoreMindee += 15;
      reasons.push('✓ Formato estándar: Mindee especializado en facturas');
    } else {
      scoreOpenai += 20;
      reasons.push('✓ Formato complejo: OpenAI más flexible');
    }

    // Factor 4: Scanned vs digital
    if (isScanned) {
      scoreOpenai += 10;
      reasons.push('✓ Documento escaneado: OpenAI mejor OCR en imágenes');
    }

    // Factor 5: Supplier history (strongest signal)
    if (supplierHistory && supplierHistory.total >= 3) {
      const preferredEngine = supplierHistory.preferred_engine;
      const preferredStats = supplierHistory[preferredEngine];
      
      if (preferredStats.avg_confidence > 75) {
        const bonus = 30;
        if (preferredEngine === 'mindee') {
          scoreMindee += bonus;
        } else {
          scoreOpenai += bonus;
        }
        reasons.push(
          `🎯 Historial del proveedor: ${preferredEngine.toUpperCase()} ` +
          `(${preferredStats.count}/${supplierHistory.total} facturas, ` +
          `${Math.round(preferredStats.avg_confidence)}% confianza promedio)`
        );
      }
    }

    // Final decision
    const recommendedEngine = scoreMindee > scoreOpenai ? 'mindee' : 'openai';
    const confidence = Math.abs(scoreMindee - scoreOpenai);

    // Calculate costs
    const openaiCost = ENGINE_COSTS.openai_per_invoice;
    const mindeeCost = pageCount * ENGINE_COSTS.mindee_per_page;
    const savingsEur = recommendedEngine === 'mindee' 
      ? Math.max(0, openaiCost - mindeeCost)
      : Math.max(0, mindeeCost - openaiCost);
    const savingsPercent = savingsEur > 0 
      ? (savingsEur / Math.max(openaiCost, mindeeCost)) * 100
      : 0;

    const analysis: DocumentAnalysis = {
      pages: pageCount,
      quality_score: Math.round(qualityScore),
      complexity,
      estimated_text_density: estimatedTextDensity,
      is_scanned: isScanned,
      recommended_engine: recommendedEngine,
      confidence: Math.round(confidence),
      reasoning: reasons,
      cost_comparison: {
        openai: openaiCost,
        mindee: mindeeCost,
        savings_eur: savingsEur,
        savings_percent: savingsPercent
      },
      supplier_history: supplierHistory || undefined
    };

    console.log('[Analyzer] Recommendation:', {
      engine: recommendedEngine,
      confidence,
      scoreMindee,
      scoreOpenai
    });

    return new Response(
      JSON.stringify(analysis),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('[Analyzer] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : String(error) 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
