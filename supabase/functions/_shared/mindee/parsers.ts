// ============================================================================
// MINDEE PARSERS - Funciones críticas de parsing europeo y fallback OCR
// ============================================================================

import type { MindeeAPIResponse } from './types.ts';

/**
 * PARSER 1: Números Europeos
 * 
 * Convierte formatos europeos mal interpretados por Mindee:
 * - 16.952,92 (real) → 16.95292 (Mindee) → 16952.92 (corregido)
 * - 1.234,56 (real) → 1.23456 (Mindee) → 1234.56 (corregido)
 * 
 * @param value - Número que puede estar en formato europeo corrupto
 * @returns Número corregido o undefined si inválido
 */
export function parseEuropeanNumber(value: number | null | undefined): number | undefined {
  if (value === null || value === undefined) return undefined;

  const valueStr = value.toString();

  // Detectar formato europeo mal interpretado:
  // Patrón: número pequeño (<100) con punto decimal y muchos decimales (>= 5 dígitos)
  if (value < 100 && valueStr.includes('.')) {
    const parts = valueStr.split('.');
    
    if (parts.length === 2 && parts[0].length <= 2 && parts[1].length >= 5) {
      // Ejemplo: "16.95292" → parts[0]="16", parts[1]="95292"
      // Separar: "952" (miles) + "92" (decimales)
      const thousands = parts[1].substring(0, 3);
      const decimals = parts[1].substring(3);
      
      const corrected = parseFloat(parts[0] + thousands + '.' + decimals);
      
      console.log('[parseEuropeanNumber] Corregido:', {
        original: value,
        corrected,
        pattern: 'european_misread',
      });
      
      return corrected;
    }
  }

  // Valor ya está correcto
  return value;
}

/**
 * PARSER 2: Extracción de Customer desde OCR Raw Text
 * 
 * Fallback cuando Mindee no detecta correctamente al cliente.
 * Busca CIF/NIF distinto al del proveedor en el texto OCR.
 * 
 * @param mindeeResponse - Respuesta completa de Mindee
 * @param supplierTaxId - CIF del proveedor (para excluirlo)
 * @returns { name, taxId } del cliente extraído
 */
export function extractCustomerDataFromRawText(
  mindeeResponse: MindeeAPIResponse,
  supplierTaxId: string
): {
  name: string | null;
  taxId: string | null;
  confidence: 'high' | 'medium' | 'low';
} {
  // Obtener texto OCR completo
  const rawText = mindeeResponse?.document?.inference?.pages?.[0]?.extras?.full_text_ocr?.content || '';
  
  if (!rawText) {
    return { name: null, taxId: null, confidence: 'low' };
  }

  console.log('[extractCustomerDataFromRawText] Analizando texto OCR...');

  // Split por líneas
  const lines = rawText.split('\n');
  
  // Patrón de CIF/NIF español
  const taxIdPattern = /\b([A-Z]\d{8}|ESB\d{8}|B\d{8}|\d{8}[A-Z])\b/g;

  let customerTaxId: string | null = null;
  let customerName: string | null = null;
  let lineIndex = -1;

  // Buscar primer CIF distinto al del proveedor
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const matches = line.match(taxIdPattern);

    if (matches) {
      for (const match of matches) {
        // Excluir CIF del proveedor
        if (match !== supplierTaxId && match.length >= 9) {
          customerTaxId = match;
          lineIndex = i;
          break;
        }
      }
    }
    
    if (customerTaxId) break;
  }

  // Si encontramos CIF, buscar nombre en líneas cercanas
  if (customerTaxId && lineIndex >= 0) {
    // Prioridad 1: línea anterior (común en facturas)
    if (lineIndex > 0) {
      const prevLine = lines[lineIndex - 1].trim();
      if (prevLine.length > 3 && !/^\d+$/.test(prevLine)) {
        customerName = prevLine;
      }
    }

    // Prioridad 2: línea siguiente
    if (!customerName && lineIndex < lines.length - 1) {
      const nextLine = lines[lineIndex + 1].trim();
      if (nextLine.length > 3 && !/^\d+$/.test(nextLine)) {
        customerName = nextLine;
      }
    }

    console.log('[extractCustomerDataFromRawText] Cliente encontrado:', {
      taxId: customerTaxId,
      name: customerName,
      lineIndex,
    });

    return {
      name: customerName,
      taxId: customerTaxId,
      confidence: customerName ? 'medium' : 'low',
    };
  }

  return { name: null, taxId: null, confidence: 'low' };
}

/**
 * PARSER 3: Desglose de IVA desde OCR Raw Text
 * 
 * Extrae tabla de IVA cuando Mindee no la parsea correctamente.
 * Soporta formatos comunes españoles:
 * - "BASE IMPONIBLE | IVA | TOTAL"
 * - "COD | IVA % | BASE | CUOTA | TOTAL"
 * 
 * @param rawText - Texto OCR completo
 * @returns Array de { tax_code, tax_description, tax_rate, tax_base, tax_amount }
 */
export interface TaxBreakdown {
  tax_code: string;
  tax_description: string;
  tax_rate: number;
  tax_base: number;
  tax_amount: number;
}

export function extractTaxBreakdownFromText(rawText: string): TaxBreakdown[] {
  const breakdowns: TaxBreakdown[] = [];

  console.log('[extractTaxBreakdownFromText] Buscando tabla de IVA en OCR...');

  // 1. Encontrar sección de IVA en el texto
  const taxTablePatterns = [
    // Patrón 1: "TOTAL POR IVA" seguido de tabla
    /TOTAL\s+POR\s+IVA[\s\S]*?(?:COD\..*?\n)?([\s\S]*?)(?=\nTOTAL\s+[\d.,]+|$)/i,
    
    // Patrón 2: "BASE IMPONIBLE" hasta "TOTAL"
    /BASE\s+IMPONIBLE.*?IVA.*?\n([\s\S]*?)(?=\nTOTAL\s+[\d.,]+|$)/i,
    
    // Patrón 3: Tabla simple con headers
    /CODIGO.*?BASE.*?IVA.*?CUOTA\n([\s\S]*?)(?=\nTOTAL|$)/i,
  ];

  let taxTableText = '';
  for (const pattern of taxTablePatterns) {
    const match = rawText.match(pattern);
    if (match) {
      taxTableText = match[1];
      console.log('[extractTaxBreakdownFromText] Tabla encontrada con patrón');
      break;
    }
  }

  if (!taxTableText) {
    console.log('[extractTaxBreakdownFromText] No se encontró tabla de IVA');
    return breakdowns;
  }

  // 2. Parsear líneas de IVA
  // Soporta 2 formatos:
  // A) 3 columnas: "A7  IVA 4%  1.838,56 EUR  73,54 EUR  1.912,10 EUR"
  // B) 2 columnas: "A7  IVA 4%  1.838,56 EUR  73,54 EUR"
  
  const linePatterns = [
    // Formato A: 5 grupos (código, descripción, base, iva, total)
    /([A-Z]\d+)\s+(IVA\s+[\d,]+%[^\d]*?)\s+([\d.,]+)\s*EUR\s+([\d.,]+)\s*EUR\s+([\d.,]+)\s*EUR/gi,

    // Formato B: 4 grupos (código, descripción, base, iva)
    /([A-Z]\d+)\s*\|?\s*(IVA\s+[\d,]+%[^|]*?)\|?\s*([\d.,]+)\s*EUR\s*\|?\s*([\d.,]+)\s*EUR/gi,
  ];

  for (const lineRegex of linePatterns) {
    let match;
    while ((match = lineRegex.exec(taxTableText)) !== null) {
      // Skip línea de totales
      if (match[1] === 'TOTAL') continue;

      const taxCode = match[1].trim();
      const description = match[2].trim();
      
      let taxBase: number;
      let taxAmount: number;

      // Formato A (5 grupos): usar match[3] y match[4]
      if (match.length === 6) {
        taxBase = parseFloat(match[3].replace(/\./g, '').replace(',', '.'));
        taxAmount = parseFloat(match[4].replace(/\./g, '').replace(',', '.'));
      } 
      // Formato B (4 grupos): usar match[3] y match[4]
      else {
        taxBase = parseFloat(match[3].replace(/\./g, '').replace(',', '.'));
        taxAmount = parseFloat(match[4].replace(/\./g, '').replace(',', '.'));
      }

      // Extraer tasa de IVA
      const rateMatch = description.match(/(\d+(?:,\d+)?)\s*%/);
      const taxRate = rateMatch ? parseFloat(rateMatch[1].replace(',', '.')) : 0;

      if (taxBase && taxAmount && taxRate) {
        breakdowns.push({
          tax_code: taxCode,
          tax_description: description,
          tax_rate: taxRate,
          tax_base: taxBase,
          tax_amount: taxAmount,
        });

        console.log('[extractTaxBreakdownFromText] Línea IVA parseada:', {
          taxCode,
          taxRate,
          taxBase,
          taxAmount,
        });
      }
    }
    
    // Si ya encontramos líneas, no intentar otros patrones
    if (breakdowns.length > 0) break;
  }

  console.log(`[extractTaxBreakdownFromText] Total líneas IVA: ${breakdowns.length}`);
  
  return breakdowns;
}

/**
 * HELPER: Calcular confidence score para un campo
 * 
 * @param value - Valor del campo
 * @param mindeeConfidence - Confidence de Mindee (0-100)
 * @param fallbackUsed - Si se usó fallback OCR
 * @returns Score ajustado (0-100)
 */
export function calculateFieldConfidence(
  value: any,
  mindeeConfidence: number,
  fallbackUsed: boolean
): number {
  if (!value) return 0;
  
  // Penalización por usar fallback
  if (fallbackUsed) {
    return Math.max(mindeeConfidence * 0.7, 50);
  }
  
  return mindeeConfidence;
}

/**
 * HELPER: Validar si totales calculados coinciden con extraídos
 * 
 * @param extracted - Total extraído de Mindee/OCR
 * @param calculated - Total calculado de líneas
 * @param tolerance - Tolerancia en euros (default: 0.50€)
 * @returns { isValid, discrepancy }
 */
export function validateTotals(
  extracted: number,
  calculated: number,
  tolerance: number = 0.50
): {
  isValid: boolean;
  discrepancy: number;
} {
  const discrepancy = Math.abs(extracted - calculated);
  
  return {
    isValid: discrepancy <= tolerance,
    discrepancy,
  };
}
