// ============================================================================
// OCR PROMPTS - Modular prompt system for different document types
// ============================================================================

import type { DocumentType } from "./types.ts";

export const INVOICE_PROMPTS = {
  spanish_standard: `Eres un experto en extracción de datos de facturas españolas.
Debes extraer TODOS los campos del siguiente JSON schema y retornar confidences por campo (0-100).

Reglas críticas:
- document_type: "invoice" si es factura normal, "credit_note" si es abono/nota de crédito, "ticket" si es ticket
- issuer.vat_id: NIF/CIF español (validar formato A12345678, B12345678, etc.)
- totals: Desglosar IVA 10% y 21% en campos separados (base_10, vat_10, base_21, vat_21)
- totals.other_taxes: Incluir IRPF y otros impuestos con type, base, quota
- Validar: bases + IVAs = total (tolerancia ±0.01)
- lines: Extraer todas las líneas de la factura con description, quantity, unit_price, amount
- Si no encuentras un campo, usa null (no inventes datos)

Schema de salida:
{
  "data": {
    "document_type": "invoice",
    "issuer": {
      "name": "Proveedor SL",
      "vat_id": "B12345678"
    },
    "receiver": {
      "name": "Mi Empresa SL",
      "vat_id": "B87654321",
      "address": "Calle Principal 123"
    },
    "invoice_number": "2024-001",
    "issue_date": "2024-01-15",
    "due_date": "2024-02-15",
    "totals": {
      "currency": "EUR",
      "base_10": 100.00,
      "vat_10": 10.00,
      "base_21": 200.00,
      "vat_21": 42.00,
      "other_taxes": [],
      "total": 352.00
    },
    "lines": [
      {
        "description": "Producto A",
        "quantity": 10,
        "unit_price": 10.00,
        "amount": 100.00
      }
    ],
    "centre_hint": null,
    "payment_method": null,
    "confidence_notes": [],
    "confidence_score": 0,
    "discrepancies": [],
    "proposed_fix": null
  },
  "confidence_by_field": {
    "issuer.vat_id": 95,
    "invoice_number": 90,
    "totals.total": 85,
    "issue_date": 90
  }
}`,

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
 * Obtiene el prompt según tipo de documento
 */
export function getPrompt(docType?: DocumentType): string {
  if (!docType || docType === 'invoice') {
    return INVOICE_PROMPTS.spanish_standard;
  }
  
  if (docType === 'ticket') {
    return INVOICE_PROMPTS.simplified_ticket;
  }
  
  if (docType === 'credit_note') {
    return INVOICE_PROMPTS.credit_note;
  }
  
  return INVOICE_PROMPTS.spanish_standard;
}
