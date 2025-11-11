# 📊 Accounting Library - Sistema de Mapeo Contable

Sistema modular para mapeo automático de cuentas PGC (Plan General Contable Español).

## 🏗️ Arquitectura

```
accounting/
├── core/
│   ├── accounts.ts      # Constantes PGC (cuentas del plan contable)
│   ├── mappers.ts       # Funciones de mapeo (proveedor, keywords)
│   └── index.ts         # Barrel export
├── composers/
│   └── map-ap.ts        # Pipeline de mapeo AP (Accounts Payable)
├── types.ts             # AccountMappingResult, InvoiceForMapping
└── index.ts             # Public API
```

## 🎯 Uso

### Mapeo de Cuentas AP + Validación de Posting

```typescript
import { mapAP, validatePosting } from '@/lib/accounting';

const invoice = {
  issuer: { name: 'MAKRO S.A.' },
  lines: [{ description: 'Aceite oliva' }],
  centre_id: 'M001',
  totals: {
    base_21: 100,
    vat_21: 21,
    total: 121
  }
};

// Paso 1: Mapear cuentas
const mapping = mapAP(invoice);

// Paso 2: Validar asiento
const validation = validatePosting(invoice, mapping);

if (validation.ready_to_post) {
  console.log('✅ Listo para posting');
  console.log(validation.post_preview);
} else {
  console.log('❌ Issues:', validation.blocking_issues);
}
```

### Solo Mapeo de Cuentas AP

```typescript
import { mapAP } from '@/lib/accounting';

const invoice = {
  issuer: { name: 'MAKRO S.A.' },
  lines: [
    { description: 'Papel higiénico' },
    { description: 'Aceite oliva' }
  ],
  centre_id: 'M001'
};

const result = mapAP(invoice);

console.log(result);
// {
//   account_suggestion: '6060000',  // Papel (keyword override)
//   tax_account: '4720000',         // IVA soportado
//   ap_account: '4100000',          // Acreedores
//   centre_id: 'M001',
//   rationale: 'Keywords en líneas (override proveedor)'
// }
```

### Estrategia de Prioridad

1. **Keywords en líneas** (más específico)
   - `PAPEL|PACKAGING|ENVASE` → 6060000

2. **Proveedor** (menos específico)
   - `MAKRO` → 6000000
   - `EUROPASTRY` → 6000001

3. **Fallback** (genérico)
   - Cualquier otro → 6200000

## 📐 Plan General Contable

### Grupo 6 - Compras y Gastos

| Cuenta | Descripción |
|--------|-------------|
| 6000000 | Compras alimentación (genérico) |
| 6000001 | Compras alimentación Europastry |
| 6060000 | Material oficina y packaging |
| 6200000 | Servicios profesionales (fallback) |

### Grupo 47 - IVA

| Cuenta | Descripción |
|--------|-------------|
| 4720000 | IVA soportado (deducible) |

### Grupo 41 - Proveedores

| Cuenta | Descripción |
|--------|-------------|
| 4100000 | Acreedores por prestaciones |

## 🧪 Testing

```bash
npm run test src/lib/accounting
```

## 🔧 Extensión

### Añadir nuevo proveedor

```typescript
// core/accounts.ts
export const SUPPLIER_PATTERNS = {
  MAKRO: /MAKRO/i,
  EUROPASTRY: /EUROPASTRY/i,
  COCA_COLA: /COCA.?COLA/i,  // ← Nuevo
} as const;

// core/mappers.ts
export function mapBySupplier(supplierName: string): string | null {
  // ...
  if (SUPPLIER_PATTERNS.COCA_COLA.test(normalized)) {
    return PGC_ACCOUNTS.PURCHASES.BEVERAGES;
  }
  // ...
}
```

### Añadir nueva keyword

```typescript
// core/accounts.ts
export const LINE_KEYWORDS = {
  PAPER: /PAPEL|PACKAGING|ENVASE/i,
  BEVERAGES: /BEBIDA|REFRESCO|AGUA/i,  // ← Nuevo
} as const;

// core/mappers.ts
export function mapByLineKeywords(lines: any[]): string | null {
  // ...
  if (LINE_KEYWORDS.BEVERAGES.test(allDescriptions)) {
    return PGC_ACCOUNTS.PURCHASES.BEVERAGES;
  }
  // ...
}
```

## 🌐 Backend

La librería está disponible también en edge functions:

```typescript
// supabase/functions/invoice-ocr/index.ts
import { mapAP } from '../_shared/accounting/index.ts';

const mapping = mapAP(ocrData);
console.log(`Cuenta sugerida: ${mapping.account_suggestion}`);
```

## 📚 Referencias

- [Plan General Contable (ICAC)](https://www.icac.gob.es/contabilidad/plan-general-contable)
- Arquitectura basada en `src/lib/fiscal/` (normalización modular)
