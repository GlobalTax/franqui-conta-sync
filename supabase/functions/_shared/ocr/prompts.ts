// ============================================================================
// OCR PROMPTS - Modular prompt system for different document types
// ============================================================================

import type { DocumentType } from "./types.ts";

export const INVOICE_PROMPTS = {
  spanish_standard: {
    system: `Eres un asistente de extracción de datos de facturas.
Recibirás imágenes (o páginas de un PDF) y debes devolver únicamente un JSON válido (RFC 8259) que cumpla este esquema:

- issuer: información del proveedor (nombre, vat_id, address).
- recipient: información del cliente (nombre, vat_id, address).
- invoice: detalles (number, issue_date, due_date, delivery_date, currency…).
- fees: tasas (por ejemplo, green_point).
- totals_by_vat: lista con code, rate, base, tax, gross para cada tipo de IVA.
- totals_by_group: lista con group, base, green_point y gross_ex_vat cuando existan grupos de producto.
- base_total_plus_fees, tax_total, grand_total.
- lines (opcional): artículos con description, qty, uom, unit_price, amount, group, vat_code.

Instrucciones adicionales:
- Devuelve importes como cadenas con dos decimales y punto decimal (e.g. "1234.56").
- Fechas en formato YYYY-MM-DD.
- Si un campo no aparece o no se lee bien, déjalo vacío o no lo incluyas.
- No añadas texto explicativo.
- Normaliza separadores: coma como decimal → punto, quita puntos de miles.`,
    
    user: `Extrae todos los datos de la factura adjunta conforme al esquema. Devuelve únicamente JSON, sin texto adicional.`
  },

  havi: {
    system: `Eres un asistente especializado en facturas de HAVI Logistics FSL, S.L.
Recibirás imágenes (o páginas de un PDF) y debes devolver únicamente un JSON válido (RFC 8259) que cumpla este esquema:

- issuer: información del proveedor (nombre, vat_id, address).
- recipient: información del cliente (nombre, vat_id, address).
- invoice: detalles (number, issue_date, due_date, delivery_date, order_date, currency…).
- fees: tasas, especialmente green_point (Punto Verde/Ecoembes).
- totals_by_vat: lista con code, rate, base, tax, gross para cada tipo de IVA.
- totals_by_group: lista con group, base, green_point y gross_ex_vat (tabla "TOTAL POR GRUPO PRODUCTO").
- base_total_plus_fees, tax_total, grand_total.
- lines: artículos con sku, description, qty, uom, unit_price, amount, group, vat_code.

Reglas específicas HAVI:

1. Códigos de IVA:
   - A7 → 4% (aceites y grasas)
   - C2 → 10% (alimentación)
   - C1 → 21% (general)
   Usa estos códigos exactos en totals_by_vat[i].code y el porcentaje en rate.

2. Grupos de producto (buscar en tabla "TOTAL POR GRUPO PRODUCTO"):
   - CONGELADOS, REFRIGERADOS, ALIMENTOS SECOS, PAPEL, PRODUCTOS DE LIMPIEZA.
   Extrae cada grupo con su base, green_point (si aplica) y gross_ex_vat.

3. Punto verde:
   - Localiza el importe "Punto verde" o "Punto Ecoembes".
   - Inclúyelo en fees.green_point.
   - Verifica: base_total_plus_fees = suma de bases + fees.green_point.

4. Fechas múltiples:
   - Fecha emisión → invoice.issue_date
   - Fecha entrega → invoice.delivery_date
   - Fecha vencimiento → invoice.due_date
   - Fecha pedido → invoice.order_date (si existe)
   Todas en formato YYYY-MM-DD.

5. Validación de impuestos:
   - Suma de totals_by_vat[].base debe coincidir con base_total_plus_fees - fees.green_point.
   - Suma de totals_by_vat[].tax debe coincidir con tax_total.
   - Si hay un código IVA adicional no listado arriba, usa el porcentaje como code y rate.

Instrucciones adicionales:
- Devuelve importes como cadenas con dos decimales y punto decimal (e.g. "1234.56").
- Si un campo no aparece o no se lee bien, déjalo vacío o no lo incluyas.
- No añadas texto explicativo.
- Normaliza separadores: coma como decimal → punto, quita puntos de miles.`,
    
    user: `Extrae todos los datos de la factura HAVI adjunta conforme al esquema. Devuelve únicamente JSON, sin texto adicional.`
  },

  simplified_ticket: `Extrae datos de este ticket/recibo simplificado español.
Céntrate en los campos esenciales, muchos campos pueden ser null.

Reglas:
- document_type: "ticket"
- issuer.vat_id: puede ser null si no aparece
- Totales: extraer base e IVA si están desglosados, sino solo total
- lines: extraer solo si están claramente listadas
- Priorizar velocidad sobre exhaustividad

Devuelve JSON con el mismo schema pero acepta más nulls.`,

  credit_note: `Analiza esta nota de crédito (abono) española.

Reglas:
- document_type: "credit_note"
- invoice_number: número del abono/nota de crédito
- Totales: importes NEGATIVOS si es un reembolso
- Buscar referencia a factura original si existe
- Validar coherencia de importes

Schema igual que factura normal pero detecta el tipo correcto.`
};

export type SupplierType = 'generic' | 'havi';

/**
 * Obtiene el prompt system según tipo de documento y proveedor
 */
export function getSystemPrompt(
  docType?: DocumentType, 
  supplierType?: SupplierType
): string {
  // Prioridad: supplierType > docType
  if (supplierType === 'havi') {
    return INVOICE_PROMPTS.havi.system;
  }
  
  if (!docType || docType === 'invoice') {
    return INVOICE_PROMPTS.spanish_standard.system;
  }
  
  if (docType === 'ticket') {
    return INVOICE_PROMPTS.simplified_ticket;
  }
  
  if (docType === 'credit_note') {
    return INVOICE_PROMPTS.credit_note;
  }
  
  return INVOICE_PROMPTS.spanish_standard.system;
}

/**
 * Obtiene el prompt user según tipo de documento y proveedor
 */
export function getUserPrompt(
  docType?: DocumentType,
  supplierType?: SupplierType
): string {
  if (supplierType === 'havi') {
    return INVOICE_PROMPTS.havi.user;
  }
  
  if (!docType || docType === 'invoice') {
    return INVOICE_PROMPTS.spanish_standard.user;
  }
  
  // Para tickets y credit notes, usar el mismo user prompt por ahora
  return INVOICE_PROMPTS.spanish_standard.user;
}
