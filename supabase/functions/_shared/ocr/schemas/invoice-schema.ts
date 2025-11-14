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
        address: { type: "string", description: "Dirección fiscal completa" }
      },
      required: ["name", "vat_id"],
      additionalProperties: false
    },
    
    recipient: {
      type: "object",
      properties: {
        name: { type: "string", description: "Nombre del cliente/restaurante" },
        vat_id: { type: "string", description: "NIF/CIF del cliente" },
        address: { type: "string", description: "Dirección completa del cliente" }
      },
      required: ["name"],
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
      required: ["number", "issue_date", "currency"],
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
        required: ["group", "base", "gross_ex_vat"],
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
      description: "Total final de la factura"
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
        required: ["description", "qty", "unit_price", "amount"],
        additionalProperties: false
      },
      description: "Líneas de detalle de la factura"
    }
  },
  required: [
    "issuer", 
    "recipient", 
    "invoice", 
    "totals_by_vat", 
    "base_total_plus_fees", 
    "tax_total", 
    "grand_total"
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
              "CARNE",
              "PAN Y BOLLERIA", 
              "PRODUCTOS LACTEOS",
              "ALIMENTACION SECA",
              "CONGELADOS",
              "ACEITES Y GRASAS",
              "VERDURAS",
              "OTROS"
            ],
            description: "Familia de producto HAVI"
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

  havi: `Eres un extractor especializado en facturas HAVI (proveedor McDonald's España).

CONOCIMIENTO ESPECÍFICO HAVI:
- Códigos IVA: A7 = 4% (aceites), C2 = 10% (alimentación básica), C1 = 21% (general)
- Familias producto: CARNE, PAN Y BOLLERIA, PRODUCTOS LACTEOS, ALIMENTACION SECA, CONGELADOS, ACEITES Y GRASAS, VERDURAS
- SKUs: Códigos numéricos de 7-8 dígitos
- Unidades: UN (unidades), KG (kilos), CA (cajas), LT (litros)
- Punto verde: Fee obligatorio, buscar en sección de cargos/fees

REGLAS EXTRACCIÓN:
- Importes como STRING con 2 decimales: "8848.96"
- Fechas YYYY-MM-DD: "2025-10-31"
- Asigna vat_code a cada línea según el tipo de producto
- Agrupa totales por A7, C2, C1
- NO inventes datos, usa "" si no lo encuentras
- Valida sumas: ∑(bases) + fees = base_total_plus_fees
- Valida: ∑(taxes) = tax_total
- Valida: base_total_plus_fees + tax_total = grand_total`
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
