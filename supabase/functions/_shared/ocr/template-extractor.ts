// ============================================================================
// TEMPLATE EXTRACTOR
// Motor de extracción OCR basado en templates configurables
// ============================================================================

/**
 * Interfaz de Template OCR
 */
export interface OCRTemplate {
  id: string;
  supplier_id: string;
  template_name: string;
  document_type: 'invoice' | 'ticket' | 'credit_note';
  field_mappings: Record<string, FieldMapping>;
  extraction_strategy: 'coordinates' | 'regex' | 'ocr_fallback';
  preferred_ocr_engine: 'template' | 'openai' | 'mindee';
  confidence_threshold: number;
  usage_count: number;
  avg_confidence: number | null;
}

/**
 * Configuración de un campo en el template
 */
export interface FieldMapping {
  x?: number; // Coordenada X (px)
  y?: number; // Coordenada Y (px)
  width?: number; // Ancho (px)
  height?: number; // Alto (px)
  page?: number; // Número de página (1-indexed)
  regex?: string; // Patrón de validación
  type?: 'text' | 'number' | 'date' | 'currency'; // Tipo de dato
  format?: string; // Formato específico (ej: "DD/MM/YYYY")
  required?: boolean; // Campo obligatorio
}

/**
 * Resultado de extracción con template
 */
export interface TemplateExtractionResult {
  engine: 'template';
  data: Record<string, any>;
  confidence: number;
  fields_extracted: number;
  fields_total: number;
  fields_failed: string[];
  template_id: string;
  template_name: string;
  extraction_time_ms: number;
}

/**
 * Extrae datos de un documento usando un template configurado
 * 
 * NOTA: Esta es una implementación básica inicial que usa regex global.
 * En Fase 2 se implementará extracción por coordenadas con pdfjs.
 */
export async function extractWithTemplate(
  base64Content: string,
  template: OCRTemplate
): Promise<TemplateExtractionResult> {
  const startTime = performance.now();

  console.log('[template-extractor] Starting extraction with template:', template.template_name);
  console.log('[template-extractor] Fields to extract:', Object.keys(template.field_mappings).length);

  const results: Record<string, any> = {};
  const fieldsFailed: string[] = [];
  let totalConfidence = 0;
  let fieldsExtracted = 0;
  const fieldsTotal = Object.keys(template.field_mappings).length;

  // Por ahora, extracción básica usando regex global sobre el texto del PDF
  // En Fase 2 se implementará extracción por coordenadas específicas
  const textContent = await extractTextFromBase64(base64Content);

  for (const [fieldName, config] of Object.entries(template.field_mappings)) {
    try {
      let extractedValue: any = null;
      let fieldConfidence = 0;

      // Estrategia 1: Regex global (implementación actual)
      if (config.regex) {
        const match = textContent.match(new RegExp(config.regex, 'i'));
        if (match) {
          extractedValue = match[0];
          fieldConfidence = 0.9; // Alta confianza si coincide con regex
        }
      }

      // Normalizar valor según tipo
      if (extractedValue) {
        extractedValue = normalizeFieldValue(extractedValue, config.type, config.format);
        results[fieldName] = extractedValue;
        fieldsExtracted++;
        totalConfidence += fieldConfidence;
      } else {
        // Campo no encontrado
        if (config.required) {
          fieldsFailed.push(fieldName);
          console.warn(`[template-extractor] Required field not found: ${fieldName}`);
        }
        results[fieldName] = null;
      }

    } catch (error: any) {
      console.error(`[template-extractor] Error extracting field ${fieldName}:`, error.message);
      fieldsFailed.push(fieldName);
      results[fieldName] = null;
    }
  }

  const avgConfidence = fieldsTotal > 0 ? totalConfidence / fieldsTotal : 0;
  const extractionTimeMs = performance.now() - startTime;

  console.log('[template-extractor] Extraction complete:', {
    fields_extracted: fieldsExtracted,
    fields_total: fieldsTotal,
    confidence: (avgConfidence * 100).toFixed(1) + '%',
    time_ms: extractionTimeMs.toFixed(0)
  });

  return {
    engine: 'template',
    data: results,
    confidence: avgConfidence,
    fields_extracted: fieldsExtracted,
    fields_total: fieldsTotal,
    fields_failed: fieldsFailed,
    template_id: template.id,
    template_name: template.template_name,
    extraction_time_ms: extractionTimeMs,
  };
}

/**
 * Extrae texto plano de un PDF en base64 (implementación básica)
 * TODO: En Fase 2 implementar con pdfjs para extraer por coordenadas
 */
async function extractTextFromBase64(base64Content: string): Promise<string> {
  try {
    // Decodificar base64
    const binaryString = atob(base64Content);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Extraer texto simple del PDF (muy básico)
    // En Fase 2 usar pdfjs para extracción real por coordenadas
    const text = new TextDecoder().decode(bytes);
    
    // Extraer texto visible (eliminar caracteres binarios)
    return text.replace(/[^\x20-\x7E\n]/g, ' ').trim();
    
  } catch (error: any) {
    console.error('[template-extractor] Error extracting text:', error.message);
    return '';
  }
}

/**
 * Normaliza un valor extraído según su tipo
 */
function normalizeFieldValue(
  value: string,
  type?: string,
  format?: string
): any {
  if (!value) return null;

  value = value.trim();

  switch (type) {
    case 'number':
      // Eliminar separadores de miles y convertir coma decimal a punto
      const cleaned = value.replace(/[.,\s]/g, (match, offset, str) => {
        // Si es la última coma o punto, es decimal
        const lastComma = str.lastIndexOf(',');
        const lastDot = str.lastIndexOf('.');
        const lastSep = Math.max(lastComma, lastDot);
        return offset === lastSep ? '.' : '';
      });
      return parseFloat(cleaned) || null;

    case 'currency':
      // Similar a number pero más robusto para monedas
      const currencyCleaned = value
        .replace(/[€$£\s]/g, '')
        .replace(/\./g, '')
        .replace(/,/g, '.');
      return parseFloat(currencyCleaned) || null;

    case 'date':
      // Normalizar fecha según formato
      // TODO: implementar parsing robusto de fechas
      return value;

    case 'text':
    default:
      return value;
  }
}
