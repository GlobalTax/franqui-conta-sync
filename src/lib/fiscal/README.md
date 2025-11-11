# 📐 Fiscal Normalization Library

Sistema modular de normalización fiscal española compatible con frontend y backend.

## 🏗️ Arquitectura

```
fiscal/
├── core/              # Funciones puras (validators, normalizers, calculators, rules)
├── composers/         # Pipelines de normalización (lite, full, backend)
├── types.ts           # Interfaces compartidas
└── index.ts           # Public API
```

## 🎯 Uso

### Lite (UI rápida - validación instantánea)

```typescript
import { normalizeLite } from '@/lib/fiscal/composers/normalize-lite';

const { validation } = normalizeLite(invoiceData);

if (!validation.ok) {
  console.error('Errores:', validation.errors);
  console.warn('Advertencias:', validation.warnings);
}
```

**Cuándo usar:** Formularios de entrada manual, validación en tiempo real sin modificar datos.

---

### Full (UI avanzada con tracking de cambios)

```typescript
import { normalizeFull } from '@/lib/fiscal/composers/normalize-full';

const { normalized, changes, warnings } = normalizeFull(invoiceData);

console.log(`${changes.length} campos modificados:`);
changes.forEach(c => 
  console.log(`- ${c.field}: ${c.before} → ${c.after} (${c.rule})`)
);
```

**Cuándo usar:** Editor de facturas OCR, revisión manual con aplicación selectiva de cambios.

---

### Backend (Edge Functions con autofixes agresivos)

```typescript
import { normalizeBackend } from '../_shared/fiscal/normalize-backend.ts';

const { normalized, validation, autofix_applied } = normalizeBackend(
  ocrData,
  rawText,
  ['B12345678', 'B87654321'] // NIFs de mi empresa
);

if (validation.ok) {
  console.log('✅ Validación OK');
  console.log('Autofixes aplicados:', autofix_applied);
} else {
  console.error('❌ Errores bloqueantes:', validation.errors);
}
```

**Cuándo usar:** Procesamiento OCR automático, importación masiva, workflows backend.

---

## 🔧 Core Library (Funciones Reutilizables)

### Validators

```typescript
import { 
  validateSpanishVAT, 
  validateTotals, 
  validateLineAmount 
} from '@/lib/fiscal/core/validators';

// NIF/CIF
const { valid, type, normalized } = validateSpanishVAT('B-12 345 678');
// → { valid: true, type: 'CIF', normalized: 'B12345678' }

// Totales
const totalsCheck = validateTotals({
  base_21: 100,
  vat_21: 21,
  total: 121,
  tolerance: 0.02
});
// → { valid: true, calculated: 121, difference: 0 }
```

### Normalizers

```typescript
import { 
  normalizeVATFormat, 
  normalizeInvoiceNumber,
  normalizeLegalName 
} from '@/lib/fiscal/core/normalizers';

normalizeVATFormat('B-12 345 678');        // → 'B12345678'
normalizeInvoiceNumber('Factura Nº 123');  // → '123'
normalizeLegalName('Mi Empresa S.L.');     // → 'Mi Empresa'
```

### Calculators

```typescript
import { 
  round2, 
  calculateExpectedVAT, 
  autofixVATRounding 
} from '@/lib/fiscal/core/calculators';

round2(10.5567);                           // → 10.56
calculateExpectedVAT(100, 0.21);           // → 21.00

const fix = autofixVATRounding(100, 20.95, 0.21);
// → { fixed: true, correctedVAT: 21.00, originalVAT: 20.95 }
```

### Rules (Constantes Fiscales)

```typescript
import { FISCAL_RULES } from '@/lib/fiscal/core/rules';

FISCAL_RULES.VAT_RATES.STANDARD        // → 0.21 (21%)
FISCAL_RULES.VAT_RATES.REDUCED         // → 0.10 (10%)
FISCAL_RULES.TOLERANCE.TOTALS          // → 0.02€
FISCAL_RULES.DEFAULT_CURRENCY          // → 'EUR'
```

---

## 📊 Comparación de Sabores

| Feature | `normalizeLite` | `normalizeFull` | `normalizeBackend` |
|---------|-----------------|-----------------|-------------------|
| **Validación NIF** | ✅ | ✅ | ✅ |
| **Validación Totales** | ✅ | ✅ | ✅ |
| **Redondeo moneda** | ✅ | ✅ | ✅ |
| **Tracking de cambios** | ❌ | ✅ | ❌ |
| **Autofix IVA** | ❌ | ❌ | ✅ |
| **Migración other_taxes** | ❌ | ❌ | ✅ |
| **Inferir receiver** | ❌ | ❌ | ✅ |
| **Credit note signos** | ❌ | ❌ | ✅ |
| **Confidence score** | ❌ | ❌ | ✅ |
| **Performance** | 🚀 <5ms | ⚡ <20ms | 💪 <50ms |

---

## ✅ Testing

```bash
npm run test src/lib/fiscal
```

Tests implementados:
- ✅ `validateSpanishVAT` (NIF, NIE, CIF)
- ✅ `validateTotals` (tolerancias, other_taxes)
- ✅ `validateLineAmount` (redondeo)
- ⏳ Normalizers (próximamente)
- ⏳ Calculators (próximamente)

---

## 🔄 Migración desde Legacy

### Antes (deprecated)

```typescript
import { stripAndNormalize } from '@/lib/fiscal-normalizer';

const { normalized, changes, warnings } = stripAndNormalize(invoice);
```

### Después (recomendado)

```typescript
import { normalizeFull } from '@/lib/fiscal';

const { normalized, changes, warnings } = normalizeFull(invoice);
```

**Nota:** El export legacy sigue disponible para backward compatibility, pero mostrará un warning en consola.

---

## 🧩 Composición Modular

Puedes crear tu propio "sabor" combinando funciones del core:

```typescript
import { 
  validateSpanishVAT, 
  round2, 
  FISCAL_RULES 
} from '@/lib/fiscal/core';

function myCustomNormalizer(invoice: any) {
  const normalized = { ...invoice };
  
  // Solo validar NIF sin modificar
  if (invoice.vat_id) {
    const { valid } = validateSpanishVAT(invoice.vat_id);
    if (!valid) throw new Error('NIF inválido');
  }
  
  // Redondear solo el total
  normalized.total = round2(invoice.total);
  
  return normalized;
}
```

---

## 📚 Recursos

- **PGC Oficial (ICAC):** [https://www.icac.gob.es](https://www.icac.gob.es)
- **Validación NIF/CIF:** Algoritmo oficial Agencia Tributaria
- **Tolerancias:** Basadas en recomendaciones Verifactu 2026

---

## 🚀 Roadmap

- [ ] Soporte multi-país (Portugal, Francia)
- [ ] Validación IBAN con dígito de control
- [ ] Extractor automático de conceptos fiscales
- [ ] ML-powered confidence scoring
