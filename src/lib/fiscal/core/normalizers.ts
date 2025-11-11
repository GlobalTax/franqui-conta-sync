// ============================================================================
// NORMALIZERS - Transformaciones de formato y limpieza OCR
// ============================================================================

/**
 * Normaliza NIF/CIF: uppercase, sin espacios/guiones
 */
export function normalizeVATFormat(vat: string): string {
  return vat.toUpperCase().replace(/[\s\-\.]/g, '').trim();
}

/**
 * Normaliza número de factura: quita prefijos OCR comunes
 */
export function normalizeInvoiceNumber(invoiceNumber: string): string {
  return invoiceNumber
    .replace(/^(Factura|Nº|N°|N\.?|#|Invoice|Bill|Núm\.)[:.\s]*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normaliza razón social: quita sufijos legales para matching
 */
export function normalizeLegalName(name: string): string {
  return name
    .replace(/\s+(S\.?A\.?|S\.?L\.?|S\.?L\.?L\.?|C\.?B\.?|S\.?COOP\.?|S\.?COM\.?)$/i, '')
    .replace(/\s+(SOCIEDAD ANÓNIMA|SOCIEDAD LIMITADA|COMUNIDAD DE BIENES)$/i, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Extrae código de centro de texto (M001, MC-001, etc.)
 */
export function extractCentreCode(text: string): string | null {
  const patterns = [
    /\b([A-Z]{1,2}\d{3,4})\b/,           // M001, MC001
    /\b([A-Z]+-\d{3,4})\b/,              // MC-001
    /\bCENTRO[:\s-]*(\d{3,4})\b/i,      // CENTRO 001
    /\bTIENDA[:\s-]*([A-Z0-9]{3,6})\b/i // TIENDA M001
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1];
  }

  return null;
}
