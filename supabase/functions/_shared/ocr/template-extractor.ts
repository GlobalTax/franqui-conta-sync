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

  // Estrategia de extracción según configuración del template
  if (template.extraction_strategy === 'coordinates' && hasCoordinates(template.field_mappings)) {
    console.log('[template-extractor] Using coordinate-based extraction');
    // Extracción por coordenadas (implementación futura con pdfjs completo)
    // Por ahora, fallback a regex
    await extractFieldsWithRegex(base64Content, template.field_mappings, results, fieldsFailed);
  } else {
    console.log('[template-extractor] Using regex-based extraction');
    await extractFieldsWithRegex(base64Content, template.field_mappings, results, fieldsFailed);
  }

  // Calcular campos extraídos y confianza
  for (const [fieldName, value] of Object.entries(results)) {
    if (value !== null) {
      const config = template.field_mappings[fieldName];
      fieldsExtracted++;
      
      // Calcular confianza del campo
      let fieldConfidence = 0.7; // Confianza base
      
      if (config.regex && typeof value === 'string') {
        const regexMatch = new RegExp(config.regex, 'i').test(value);
        fieldConfidence = regexMatch ? 0.95 : 0.6;
      } else if (value) {
        fieldConfidence = 0.8;
      }
      
      totalConfidence += fieldConfidence;
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
 * Verifica si el template tiene coordenadas definidas
 */
function hasCoordinates(fieldMappings: Record<string, FieldMapping>): boolean {
  return Object.values(fieldMappings).some(
    config => config.x !== undefined && config.y !== undefined
  );
}

/**
 * Extrae campos usando regex global sobre el texto del PDF
 */
async function extractFieldsWithRegex(
  base64Content: string,
  fieldMappings: Record<string, FieldMapping>,
  results: Record<string, any>,
  fieldsFailed: string[]
): Promise<void> {
  const textContent = await extractTextFromBase64(base64Content);

  for (const [fieldName, config] of Object.entries(fieldMappings)) {
    try {
      let extractedValue: any = null;

      // Intentar extracción con regex
      if (config.regex) {
        const match = textContent.match(new RegExp(config.regex, 'i'));
        if (match) {
          extractedValue = match[0];
        }
      }

      // Normalizar valor según tipo
      if (extractedValue) {
        extractedValue = normalizeFieldValue(extractedValue, config.type, config.format);
      }

      results[fieldName] = extractedValue;

      // Marcar como fallido si es requerido y no se encontró
      if (!extractedValue && config.required) {
        fieldsFailed.push(fieldName);
        console.warn(`[template-extractor] Required field not found: ${fieldName}`);
      }

    } catch (error: any) {
      console.error(`[template-extractor] Error extracting field ${fieldName}:`, error.message);
      fieldsFailed.push(fieldName);
      results[fieldName] = null;
    }
  }
}

/**
 * Extrae texto dentro de un bounding box específico
 */
function extractTextInBoundingBox(
  textItems: any[],
  x: number,
  y: number,
  width: number,
  height: number
): string {
  const results: string[] = [];
  
  for (const item of textItems) {
    if (!item.transform || !item.str) continue;
    
    // pdfjs devuelve coordenadas en formato: [scaleX, skewY, skewX, scaleY, translateX, translateY]
    const itemX = item.transform[4];
    const itemY = item.transform[5];
    const itemHeight = item.height || 12;
    
    // Verificar si el texto está dentro del bounding box
    // Nota: En PDFs, Y aumenta hacia abajo desde arriba
    const isInBounds = 
      itemX >= x && 
      itemX <= (x + width) &&
      itemY >= y &&
      itemY <= (y + height + itemHeight);
    
    if (isInBounds) {
      results.push(item.str);
    }
  }
  
  return results.join(' ').trim();
}

/**
 * Extrae texto de un PDF usando pdfjs con coordenadas específicas
 */
async function extractTextFromBase64(base64Content: string): Promise<string> {
  try {
    // Decodificar base64
    const binaryString = atob(base64Content);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Extraer texto simple del PDF (fallback básico)
    const text = new TextDecoder().decode(bytes);
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
      const numCleaned = value
        .replace(/[^\d,.-]/g, '') // Mantener solo dígitos, comas, puntos y guiones
        .replace(/\./g, '') // Eliminar puntos (separador de miles en ES)
        .replace(/,/g, '.'); // Convertir coma a punto decimal
      const parsed = parseFloat(numCleaned);
      return isNaN(parsed) ? null : parsed;

    case 'currency':
      // Similar a number pero más robusto para monedas
      const currencyCleaned = value
        .replace(/[€$£\s]/g, '') // Eliminar símbolos de moneda y espacios
        .replace(/\./g, '') // Eliminar separadores de miles
        .replace(/,/g, '.'); // Convertir coma decimal a punto
      const currencyParsed = parseFloat(currencyCleaned);
      return isNaN(currencyParsed) ? null : currencyParsed;

    case 'date':
      // Intentar parsear fechas en formato DD/MM/YYYY o DD-MM-YYYY
      const dateMatch = value.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
      if (dateMatch) {
        const [_, day, month, year] = dateMatch;
        // Formato ISO: YYYY-MM-DD
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
      // Si no coincide, devolver el valor original
      return value;

    case 'text':
    default:
      return value;
  }
}
