// ============================================================================
// OCR PROMPTS - Modular prompt system for different document types
// ============================================================================

import type { DocumentType } from "./types.ts";

export const INVOICE_PROMPTS = {
  spanish_standard: {
    system: `Eres un asistente especializado en extracción de datos de facturas españolas.
Tu objetivo es recibir una o varias imágenes o páginas de un PDF y devolver un objeto JSON perfectamente válido de acuerdo con el esquema proporcionado.

Instrucciones detalladas:

1. Formato de salida:
   - Debes responder solo con JSON, sin comentarios ni texto adicional fuera de las llaves.
   - El JSON debe cumplir el estándar RFC 8259 (comillas dobles, sin comas finales).

2. Campos y estructura:
   - issuer: información del emisor/proveedor (name, vat_id, address).
   - recipient: información del cliente (name, vat_id, address).
   - invoice: detalles básicos (number, issue_date, due_date, delivery_date, currency, etc.).
   - fees: incluye green_point o tasas de reciclaje si aparecen.
   - totals_by_vat: lista de objetos con cada tipo de IVA detectado:
     * code (p. ej. "A7", "C1", "C2" o, si no se especifica, utiliza un identificador como "21" o "10")
     * rate (tipo de IVA en porcentaje, como "4", "10", "21")
     * base (base imponible)
     * tax (cuota de IVA)
     * gross (base + cuota)
   - totals_by_group: lista de objetos que agrupan productos o servicios (si existen tablas tipo "TOTAL POR GRUPO PRODUCTO"). Cada grupo tendrá group (nombre), base, green_point (si aplica) y gross_ex_vat.
   - base_total_plus_fees: suma de todas las bases imponibles más tasas (punto verde).
   - tax_total: suma de todas las cuotas de IVA.
   - grand_total: importe total con IVA incluido.
   - lines (opcional): para cada artículo o línea de la factura, incluye description, qty, uom (unidad), unit_price, amount, group (categoría o familia) y vat_code.

3. Formatos y normalización:
   - Fechas en formato YYYY-MM-DD (por ejemplo, "2025-10-31").
   - Importes siempre en euro y como cadena con dos decimales y punto decimal (ej. "1234.56").
   - Números de factura y CIF/NIF deben transcribirse exactamente como aparecen (mayúsculas, sin espacios intermedios).
   - Si un campo no se puede leer con claridad, déjalo como cadena vacía ("") o no lo incluyas en el JSON.

4. Tolerancia y consistencia:
   - No inventes datos.
   - Si hay discrepancias entre tablas (p. ej., "TOTAL POR IVA" vs. "TOTAL POR GRUPO"), opta por los cuadros de totales y las cifras más fiables.
   - Para los tipos de IVA, detecta porcentajes típicos (4%, 10%, 21%) y, si no hay código específico, utiliza el porcentaje como valor de rate.

5. Locales y variantes:
   - Los valores pueden venir separados por puntos de miles y comas de decimales; conviértelos a formato estándar (punto como separador decimal).
   - Algunos términos pueden variar ("IVA", "VAT", "Tax rate", "Green point", "Punto verde"). Reconócelos y normalízalos.

Recuerda: la respuesta debe ser únicamente el objeto JSON que cumpla con el esquema, sin texto adicional.`,
    
    user: `Por favor, extrae todos los datos de la factura adjunta conforme al esquema y las normas descritas. Devuelve únicamente el JSON.
Si no consigues algún valor, deja el campo vacío o no lo incluyas.`
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

/**
 * Obtiene el prompt system según tipo de documento
 */
export function getSystemPrompt(docType?: DocumentType): string {
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
 * Obtiene el prompt user según tipo de documento
 */
export function getUserPrompt(docType?: DocumentType): string {
  if (!docType || docType === 'invoice') {
    return INVOICE_PROMPTS.spanish_standard.user;
  }
  
  // Para tickets y credit notes, usar el mismo user prompt por ahora
  return INVOICE_PROMPTS.spanish_standard.user;
}
