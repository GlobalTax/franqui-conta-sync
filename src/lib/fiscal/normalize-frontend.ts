/**
 * Frontend wrapper para normalización fiscal
 * Convierte OCR payload a formato normalizado para mapeo contable
 */

interface OCRPayload {
  invoice_number?: string;
  issue_date?: string;
  supplier?: {
    name?: string;
    vat?: string;
  };
  issuer?: {
    name?: string;
    vat_id?: string;
  };
  totals?: {
    base_10?: number;
    vat_10?: number;
    base_21?: number;
    vat_21?: number;
    total?: number;
  };
  lines?: Array<{
    description?: string;
    quantity?: number;
    unit_price?: number;
    amount?: number;
  }>;
  centre_id?: string | null;
}

export interface NormalizedInvoice {
  invoice_number?: string;
  issue_date?: string;
  issuer?: {
    name?: string;
    vat_id?: string;
  };
  totals?: {
    base_10?: number | null;
    vat_10?: number | null;
    base_21?: number | null;
    vat_21?: number | null;
    total: number;
  };
  lines?: Array<{
    description?: string;
  }>;
  centre_id?: string | null;
}

/**
 * Normaliza payload OCR para uso en frontend
 */
export function normalizeInvoiceForFrontend(payload: OCRPayload): NormalizedInvoice {
  return {
    invoice_number: payload.invoice_number || '',
    issue_date: payload.issue_date || '',
    issuer: {
      name: payload.issuer?.name || payload.supplier?.name || '',
      vat_id: payload.issuer?.vat_id || payload.supplier?.vat || '',
    },
    totals: {
      base_10: payload.totals?.base_10 || null,
      vat_10: payload.totals?.vat_10 || null,
      base_21: payload.totals?.base_21 || null,
      vat_21: payload.totals?.vat_21 || null,
      total: payload.totals?.total || 0,
    },
    lines: payload.lines?.map(line => ({
      description: line.description || '',
    })) || [],
    centre_id: payload.centre_id || null,
  };
}
