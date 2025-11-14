// ============================================================================
// INVOICE JSON SCHEMAS - Structured extraction with OpenAI JSON mode
// ============================================================================

export type SupplierType = 'havi' | 'generic';

// ============================================================================
// BASE SCHEMA - Plan General Contable Español compliant
// ============================================================================

// ============================================================================
// ENHANCED GENERIC SCHEMA - Complete Spanish invoice with groups and lines
// ============================================================================
export const GENERIC_INVOICE_SCHEMA = {
  type: "object",
  properties: {
    issuer: {
      type: "object",
      properties: {
        name: { type: "string", description: "Nombre completo del emisor/proveedor" },
        vat_id: { type: "string", description: "NIF/CIF español (ej: B12345678)" },
        address: { type: "string", description: "Dirección fiscal completa (puede estar vacía)" }
      },
      required: ["name", "vat_id", "address"],
      additionalProperties: false
    },
    
    recipient: {
      type: "object",
      properties: {
        name: { type: "string", description: "Nombre del cliente/restaurante" },
        vat_id: { type: "string", description: "NIF/CIF del cliente (puede estar vacío)" },
        address: { type: "string", description: "Dirección completa del cliente (puede estar vacía)" }
      },
      required: ["name", "vat_id", "address"],
      additionalProperties: false
    },
    
    invoice: {
      type: "object",
      properties: {
        number: { type: "string", description: "Número de factura completo" },
        issue_date: { 
          type: "string", 
          pattern: "^\\d{4}-\\d{2}-\\d{2}$",
          description: "Fecha de emisión formato YYYY-MM-DD"
        },
        delivery_date: { 
          type: "string", 
          pattern: "^\\d{4}-\\d{2}-\\d{2}$",
          description: "Fecha de entrega formato YYYY-MM-DD"
        },
        due_date: { 
          type: "string", 
          pattern: "^\\d{4}-\\d{2}-\\d{2}$",
          description: "Fecha de vencimiento formato YYYY-MM-DD"
        },
        currency: { 
          type: "string", 
          enum: ["EUR"],
          description: "Moneda siempre EUR"
        }
      },
      required: ["number", "issue_date", "delivery_date", "due_date", "currency"],
      additionalProperties: false
    },
    
    fees: {
      type: "object",
      properties: {
        green_point: { 
          type: "string", 
          pattern: "^-?\\d+\\.\\d{2}$",
          description: "Punto verde / tasa de reciclaje en formato decimal (ej: 1.23)"
        }
      },
      required: ["green_point"],
      additionalProperties: false
    },
    
    totals_by_vat: {
      type: "array",
      items: {
        type: "object",
        properties: {
          code: { 
            type: "string", 
            description: "Código IVA (ej: A7, C1, C2) o porcentaje si no hay código (ej: '21', '10')" 
          },
          rate: { 
            type: "string", 
            description: "Tipo impositivo en porcentaje (ej: '21', '10', '4')" 
          },
          base: { 
            type: "string", 
            pattern: "^-?\\d+\\.\\d{2}$",
            description: "Base imponible en EUR con 2 decimales"
          },
          tax: { 
            type: "string", 
            pattern: "^-?\\d+\\.\\d{2}$",
            description: "Cuota IVA en EUR con 2 decimales"
          },
          gross: { 
            type: "string", 
            pattern: "^-?\\d+\\.\\d{2}$",
            description: "Base + IVA en EUR con 2 decimales"
          }
        },
        required: ["code", "rate", "base", "tax", "gross"],
        additionalProperties: false
      },
      description: "Desglose de totales por cada tipo de IVA detectado"
    },
    
    totals_by_group: {
      type: "array",
      items: {
        type: "object",
        properties: {
          group: { 
            type: "string", 
            description: "Nombre del grupo de productos (ej: 'ALIMENTOS', 'BEBIDAS', 'LIMPIEZA')" 
          },
          base: { 
            type: "string", 
            pattern: "^-?\\d+\\.\\d{2}$",
            description: "Base imponible del grupo (sin IVA)"
          },
          green_point: { 
            type: "string", 
            pattern: "^-?\\d+\\.\\d{2}$",
            description: "Punto verde aplicado al grupo (si existe)"
          },
          gross_ex_vat: { 
            type: "string", 
            pattern: "^-?\\d+\\.\\d{2}$",
            description: "Total del grupo sin IVA (base + punto verde)"
          }
        },
        required: ["group", "base", "green_point", "gross_ex_vat"],
        additionalProperties: false
      },
      description: "Totales agrupados por familia de productos (opcional)"
    },
    
    base_total_plus_fees: { 
      type: "string", 
      pattern: "^-?\\d+\\.\\d{2}$",
      description: "Suma de todas las bases imponibles + fees (punto verde)"
    },
    
    tax_total: { 
      type: "string", 
      pattern: "^-?\\d+\\.\\d{2}$",
      description: "Suma de todas las cuotas de IVA"
    },
    
    grand_total: { 
      type: "string", 
      pattern: "^-?\\d+\\.\\d{2}$",
      description: "Total final de la factura (base_total_plus_fees + tax_total)"
    },
    
    validation_errors: {
      type: "array",
      items: { type: "string" },
      description: "Errores de validación contable detectados por auto-validación (vacío si todo correcto)"
    },
    
    lines: {
      type: "array",
      items: {
        type: "object",
        properties: {
          sku: { type: "string", description: "Código de producto" },
          description: { type: "string", description: "Descripción del producto/servicio" },
          qty: { type: "number", description: "Cantidad" },
          uom: { type: "string", description: "Unidad de medida (ej: UN, KG)" },
          unit_price: { 
            type: "string", 
            pattern: "^-?\\d+\\.\\d{2}$",
            description: "Precio unitario"
          },
          amount: { 
            type: "string", 
            pattern: "^-?\\d+\\.\\d{2}$",
            description: "Importe línea (qty * unit_price)"
          },
          group: { type: "string", description: "Grupo/familia de producto" },
          vat_code: { type: "string", description: "Código IVA aplicado" }
        },
        required: ["description", "qty", "uom", "unit_price", "amount", "sku", "group", "vat_code"],
        additionalProperties: false
      },
      description: "Líneas de detalle de la factura"
    }
  },
  required: [
    "issuer",              // ✅ línea 19-28
    "recipient",           // ✅ línea 30-39
    "invoice",             // ✅ línea 41-68
    "fees",                // ➕ línea 70-81
    "totals_by_vat",       // ✅ línea 83-114
    "totals_by_group",     // ➕ línea 116-145
    "base_total_plus_fees",// ✅ línea 147-151
    "tax_total",           // ✅ línea 153-157
    "grand_total",         // ✅ línea 159-163
    "validation_errors",   // ➕ línea 165-169
    "lines"                // ➕ línea 171-197
  ],
  additionalProperties: false
};

// ============================================================================
// HAVI SPECIFIC SCHEMA - Enhanced with HAVI domain knowledge
// ============================================================================

export const HAVI_INVOICE_SCHEMA = {
  ...GENERIC_INVOICE_SCHEMA,
  properties: {
    ...GENERIC_INVOICE_SCHEMA.properties,
    
    // Override totals_by_vat with HAVI-specific codes
    totals_by_vat: {
      type: "array",
      items: {
        type: "object",
        properties: {
          code: { 
            type: "string", 
            enum: ["A7", "C2", "C1"],
            description: "Código IVA HAVI: A7=4%, C2=10%, C1=21%"
          },
          rate: { 
            type: "string", 
            enum: ["4%", "10%", "21%"],
            description: "Tipo impositivo"
          },
          base: { 
            type: "string", 
            pattern: "^-?\\d+\\.\\d{2}$",
            description: "Base imponible"
          },
          tax: { 
            type: "string", 
            pattern: "^-?\\d+\\.\\d{2}$",
            description: "Cuota IVA"
          },
          gross: { 
            type: "string", 
            pattern: "^-?\\d+\\.\\d{2}$",
            description: "Base + IVA"
          }
        },
        required: ["code", "rate", "base", "tax", "gross"],
        additionalProperties: false
      },
      description: "Desglose HAVI: A7 (aceites 4%), C2 (alimentación 10%), C1 (general 21%)"
    },
    
    // HAVI-specific line groupings
    lines: {
      type: "array",
      items: {
        type: "object",
        properties: {
          sku: { type: "string", description: "Código HAVI (7-8 dígitos)" },
          description: { type: "string", description: "Descripción del producto" },
          qty: { type: "number", description: "Cantidad" },
          uom: { 
            type: "string", 
            enum: ["UN", "KG", "CA", "LT"],
            description: "Unidad: UN (unidades), KG (kilos), CA (cajas), LT (litros)"
          },
          unit_price: { 
            type: "string", 
            pattern: "^-?\\d+\\.\\d{2}$",
            description: "Precio unitario"
          },
          amount: { 
            type: "string", 
            pattern: "^-?\\d+\\.\\d{2}$",
            description: "Importe línea"
          },
          group: { 
            type: "string",
            enum: [
              "CONGELADOS",
              "REFRIGERADOS",
              "ALIMENTOS SECOS",
              "PAPEL",
              "PRODUCTOS DE LIMPIEZA"
            ],
            description: "Grupos de producto HAVI según tabla 'TOTAL POR GRUPO PRODUCTO'"
          },
          vat_code: { 
            type: "string",
            enum: ["A7", "C2", "C1"],
            description: "Código IVA HAVI"
          }
        },
        required: ["description", "qty", "unit_price", "amount", "vat_code"],
        additionalProperties: false
      },
      description: "Líneas con agrupaciones HAVI estándar"
    }
  }
};

// ============================================================================
// SCHEMA SELECTOR
// ============================================================================

export function getInvoiceSchema(supplierType: SupplierType = 'generic') {
  switch (supplierType) {
    case 'havi':
      return HAVI_INVOICE_SCHEMA;
    case 'generic':
    default:
      return GENERIC_INVOICE_SCHEMA;
  }
}

// ============================================================================
// SYSTEM PROMPTS BY SUPPLIER
// ============================================================================

export const SYSTEM_PROMPTS = {
  generic: `Eres un extractor de datos de facturas españolas. Devuelve SOLO JSON válido según el schema.

REGLAS CRÍTICAS:
- Importes como STRING con 2 decimales y punto decimal (ej: "123.45")
- Fechas formato YYYY-MM-DD (ej: "2025-10-31")
- Si un dato no está claro, usa "" para strings o no incluyas el campo opcional
- NO añadas comentarios ni texto fuera del JSON
- Valida que base + tax = gross en cada línea de totals_by_vat
- Valida que base_total_plus_fees + tax_total = grand_total`,

  havi: `Eres un asistente especializado en facturas de HAVI Logistics FSL, S.L.
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
- Normaliza separadores: coma como decimal → punto, quita puntos de miles.`
};

export function getSystemPrompt(supplierType: SupplierType = 'generic'): string {
  return SYSTEM_PROMPTS[supplierType];
}

// ============================================================================
// SUPPLIER TYPE DETECTION
// ============================================================================

export function detectSupplierType(supplierHint?: string | null): SupplierType {
  if (!supplierHint) return 'generic';
  
  const hint = supplierHint.toLowerCase().trim();
  
  if (hint.includes('havi')) return 'havi';
  
  // Add more suppliers here in the future
  // if (hint.includes('sysco')) return 'sysco';
  
  return 'generic';
}
