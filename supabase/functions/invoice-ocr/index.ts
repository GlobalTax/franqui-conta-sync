import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";

/**
 * CORS Configuration
 * Set ALLOWED_ORIGIN env var in Supabase Project Settings
 * Examples:
 * - Single: "https://app.franquicontasync.com"
 * - Multiple: "https://app.com,https://staging.app.com"
 * - Dev: leave empty or "*" for local development
 */
const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGIN") || "*")
  .split(",")
  .map(o => o.trim());

interface OCRRequest {
  documentPath: string;
  centroCode: string;
}

interface ParsedInvoiceData {
  supplier: {
    name: string;
    taxId: string;
    matched: boolean;
    matchedId?: string;
    matchConfidence?: number;
  };
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string;
  subtotal: number;
  taxTotal: number;
  total: number;
  lines: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
    total: number;
  }>;
}

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
    const { documentPath, centroCode }: OCRRequest = await req.json();
    
    if (!documentPath || !centroCode) {
      throw new Error('documentPath and centroCode are required');
    }

    console.log(`Processing OCR for document: ${documentPath}`);

    const GOOGLE_VISION_API_KEY = Deno.env.get('GOOGLE_VISION_API_KEY');
    if (!GOOGLE_VISION_API_KEY) {
      throw new Error('GOOGLE_VISION_API_KEY is not configured');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Download PDF from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('invoice-documents')
      .download(documentPath);

    if (downloadError) {
      console.error('Error downloading file:', downloadError);
      throw new Error(`Failed to download file: ${downloadError.message}`);
    }

    // Convert PDF to base64
    const arrayBuffer = await fileData.arrayBuffer();
    const base64Content = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    console.log('Sending to Google Vision API...');

    // Call Google Vision API
    const visionResponse = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_VISION_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [{
            image: { content: base64Content },
            features: [
              { type: 'DOCUMENT_TEXT_DETECTION' },
              { type: 'TEXT_DETECTION' }
            ]
          }]
        })
      }
    );

    if (!visionResponse.ok) {
      const errorText = await visionResponse.text();
      console.error('Vision API error:', errorText);
      throw new Error(`Vision API error: ${visionResponse.status} - ${errorText}`);
    }

    const visionData = await visionResponse.json();
    const fullText = visionData.responses[0]?.fullTextAnnotation?.text || '';
    
    console.log('OCR text extracted, length:', fullText.length);

    // Parse invoice data
    const parsedData = parseInvoiceData(fullText);
    
    // Match supplier
    const supplierMatch = await matchSupplier(supabase, parsedData.supplier, centroCode);
    parsedData.supplier = { ...parsedData.supplier, ...supplierMatch };

    // Calculate confidence
    const confidence = calculateConfidence(parsedData, fullText);

    const processingTime = Date.now() - startTime;

    console.log(`OCR completed in ${processingTime}ms with confidence ${confidence}`);

    return new Response(
      JSON.stringify({
        success: true,
        confidence,
        data: parsedData,
        rawText: fullText,
        processingTimeMs: processingTime,
        warnings: generateWarnings(parsedData)
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

function parseInvoiceData(text: string): ParsedInvoiceData {
  const lines = text.split('\n');
  
  // Extract tax ID (NIF/CIF)
  const taxIdMatch = text.match(/\b([A-Z]\d{8}|[A-Z]\d{7}[A-Z]|\d{8}[A-Z])\b/i);
  const taxId = taxIdMatch ? taxIdMatch[1].toUpperCase() : '';

  // Extract supplier name (usually near the top, before the tax ID)
  const taxIdIndex = lines.findIndex(line => line.includes(taxId));
  let supplierName = '';
  if (taxIdIndex > 0) {
    // Look for company name in previous lines
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

  // Extract dates (DD/MM/YYYY or DD-MM-YYYY)
  const dateMatches = [...text.matchAll(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/g)];
  const invoiceDate = dateMatches[0] ? formatDate(dateMatches[0][3], dateMatches[0][2], dateMatches[0][1]) : '';
  const dueDate = dateMatches[1] ? formatDate(dateMatches[1][3], dateMatches[1][2], dateMatches[1][1]) : undefined;

  // Extract amounts (format: 1.234,56)
  const amountPattern = /(\d{1,3}(?:\.\d{3})*,\d{2})/g;
  const amounts = [...text.matchAll(amountPattern)].map(m => parseSpanishAmount(m[1]));

  // Extract total (last significant amount or labeled as "total")
  let total = 0;
  const totalMatch = text.match(/(?:total|importe\s*total)\s*:?\s*(\d{1,3}(?:\.\d{3})*,\d{2})/i);
  if (totalMatch) {
    total = parseSpanishAmount(totalMatch[1]);
  } else if (amounts.length > 0) {
    total = Math.max(...amounts);
  }

  // Extract VAT rate
  const vatMatch = text.match(/IVA\s*(?:\()?\s*(\d+)\s*%/i);
  const vatRate = vatMatch ? parseInt(vatMatch[1]) : 21; // Default to 21%

  // Calculate subtotal and tax
  const taxTotal = total / (1 + vatRate / 100) * (vatRate / 100);
  const subtotal = total - taxTotal;

  // Parse invoice lines (simplified - looks for patterns like description + quantity + price)
  const invoiceLines: ParsedInvoiceData['lines'] = [];
  
  // Look for table-like structures in the text
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Pattern: text followed by numbers
    const lineMatch = line.match(/^(.+?)\s+(\d+(?:,\d+)?)\s+(\d{1,3}(?:\.\d{3})*,\d{2})\s+(\d{1,3}(?:\.\d{3})*,\d{2})$/);
    if (lineMatch) {
      invoiceLines.push({
        description: lineMatch[1].trim(),
        quantity: parseFloat(lineMatch[2].replace(',', '.')),
        unitPrice: parseSpanishAmount(lineMatch[3]),
        taxRate: vatRate,
        total: parseSpanishAmount(lineMatch[4])
      });
    }
  }

  // If no lines found, create a single line with the total
  if (invoiceLines.length === 0 && total > 0) {
    invoiceLines.push({
      description: 'Concepto general',
      quantity: 1,
      unitPrice: subtotal,
      taxRate: vatRate,
      total: subtotal
    });
  }

  return {
    supplier: {
      name: supplierName,
      taxId,
      matched: false
    },
    invoiceNumber,
    invoiceDate,
    dueDate,
    subtotal: Math.round(subtotal * 100) / 100,
    taxTotal: Math.round(taxTotal * 100) / 100,
    total: Math.round(total * 100) / 100,
    lines: invoiceLines
  };
}

async function matchSupplier(supabase: any, supplierData: any, centroCode: string) {
  if (!supplierData.taxId) {
    return { matched: false };
  }

  // Try exact match by tax ID
  const { data: exactMatch } = await supabase
    .from('suppliers')
    .select('id, name, tax_id')
    .eq('tax_id', supplierData.taxId)
    .eq('active', true)
    .maybeSingle();

  if (exactMatch) {
    return {
      matched: true,
      matchedId: exactMatch.id,
      matchConfidence: 1.0
    };
  }

  // Try fuzzy match by name if tax ID didn't match
  if (supplierData.name) {
    const { data: nameMatches } = await supabase
      .from('suppliers')
      .select('id, name, tax_id')
      .eq('active', true)
      .ilike('name', `%${supplierData.name.substring(0, 10)}%`)
      .limit(5);

    if (nameMatches && nameMatches.length > 0) {
      // Simple fuzzy matching by string similarity
      const bestMatch = nameMatches[0];
      const similarity = calculateStringSimilarity(
        supplierData.name.toLowerCase(),
        bestMatch.name.toLowerCase()
      );

      if (similarity > 0.7) {
        return {
          matched: true,
          matchedId: bestMatch.id,
          matchConfidence: similarity
        };
      }
    }
  }

  return { matched: false };
}

function calculateStringSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

function calculateConfidence(data: ParsedInvoiceData, rawText: string): number {
  let totalScore = 0;
  let maxScore = 0;

  // Supplier confidence (25%)
  maxScore += 25;
  if (data.supplier.taxId && data.supplier.taxId.match(/^[A-Z]\d{7,8}[A-Z]?$/)) {
    totalScore += 20;
  }
  if (data.supplier.name && data.supplier.name.length > 3) {
    totalScore += 5;
  }

  // Invoice number confidence (15%)
  maxScore += 15;
  if (data.invoiceNumber && data.invoiceNumber.length > 2) {
    totalScore += 15;
  }

  // Date confidence (15%)
  maxScore += 15;
  if (data.invoiceDate && data.invoiceDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
    totalScore += 15;
  }

  // Amounts confidence (30%)
  maxScore += 30;
  const calculatedTotal = data.subtotal + data.taxTotal;
  const tolerance = 0.02;
  if (Math.abs(calculatedTotal - data.total) <= tolerance) {
    totalScore += 30;
  } else if (data.total > 0) {
    totalScore += 15; // Partial credit if amounts exist
  }

  // Lines confidence (15%)
  maxScore += 15;
  if (data.lines.length > 0) {
    const linesTotal = data.lines.reduce((sum, line) => sum + line.total, 0);
    if (Math.abs(linesTotal - data.subtotal) <= tolerance * data.lines.length) {
      totalScore += 15;
    } else {
      totalScore += 8; // Partial credit
    }
  }

  return Math.round((totalScore / maxScore) * 100) / 100;
}

function generateWarnings(data: ParsedInvoiceData): string[] {
  const warnings: string[] = [];

  if (!data.supplier.taxId) {
    warnings.push('No se pudo extraer el NIF/CIF del proveedor');
  }

  if (!data.supplier.name) {
    warnings.push('No se pudo extraer el nombre del proveedor');
  }

  if (!data.invoiceNumber) {
    warnings.push('No se pudo extraer el número de factura');
  }

  if (!data.invoiceDate) {
    warnings.push('No se pudo extraer la fecha de factura');
  }

  if (!data.dueDate) {
    warnings.push('No se encontró fecha de vencimiento');
  }

  if (data.lines.length === 0) {
    warnings.push('No se pudieron extraer líneas de factura detalladas');
  }

  const calculatedTotal = data.subtotal + data.taxTotal;
  if (Math.abs(calculatedTotal - data.total) > 0.02) {
    warnings.push('Los totales calculados no coinciden exactamente (posible error de redondeo)');
  }

  return warnings;
}

function parseSpanishAmount(amount: string): number {
  // Convert 1.234,56 to 1234.56
  return parseFloat(amount.replace(/\./g, '').replace(',', '.'));
}

function formatDate(year: string, month: string, day: string): string {
  // Convert DD/MM/YYYY to YYYY-MM-DD
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}
