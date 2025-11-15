# 📚 Guía de Correcciones del Sistema Contable

## 🎯 Objetivo
Esta guía documenta las correcciones críticas implementadas en el sistema contable de FranquiConta para garantizar la funcionalidad completa del módulo de cierres y validaciones.

---

## 🔧 Cambios Implementados

### 1️⃣ **Tabla `closing_periods`**
**Estado Anterior:** ❌ No existía  
**Estado Actual:** ✅ Creada con estructura completa

**Estructura:**
```sql
closing_periods
├── id (UUID, PK)
├── centro_code (TEXT, FK → centres)
├── period_type (TEXT: 'monthly' | 'annual')
├── period_year (INTEGER)
├── period_month (INTEGER, nullable)
├── status (TEXT: 'open' | 'closed')
├── closing_date (DATE)
├── closing_entry_id (UUID, FK → accounting_entries)
├── regularization_entry_id (UUID, FK → accounting_entries)
├── closed_by (UUID, FK → auth.users)
├── notes (TEXT)
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ)
```

**Restricciones:**
- Unicidad: `(centro_code, period_year, period_month)`
- Check: Los períodos mensuales deben tener `period_month`, los anuales no

**Políticas RLS:**
- ✅ Admins: acceso completo
- ✅ Usuarios: solo ven períodos de sus centros accesibles
- ✅ Permisos: requiere `accounting.close_period` para crear/actualizar

---

### 2️⃣ **RPC: `get_closing_periods`**
**Estado Anterior:** ❌ No existía  
**Estado Actual:** ✅ Implementado

**Uso:**
```typescript
const { data, error } = await supabase.rpc('get_closing_periods', {
  p_centro_code: 'CENTRO_001', // opcional
  p_year: 2024                 // opcional
});
```

**Retorna:**
```typescript
interface ClosingPeriod {
  id: string;
  centro_code: string;
  period_type: 'monthly' | 'annual';
  period_year: number;
  period_month: number | null;
  status: 'open' | 'closed';
  closing_date: string | null;
  closing_entry_id: string | null;
  regularization_entry_id: string | null;
  closed_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
```

---

### 3️⃣ **RPC: `validate_fiscal_year_balance`**
**Estado Anterior:** ❌ No existía  
**Estado Actual:** ✅ Implementado

**Propósito:** Valida que Debe = Haber en un ejercicio fiscal

**Uso:**
```typescript
const { data, error } = await supabase.rpc('validate_fiscal_year_balance', {
  p_fiscal_year_id: 'uuid-del-ejercicio'
});

// data[0] → { is_valid, total_debit, total_credit, difference, message }
```

**Criterio de Validación:**
- ✅ Válido si `|Debe - Haber| < 0.01€`
- ❌ Inválido si hay descuadre mayor a 1 céntimo

---

### 4️⃣ **RPC: `validate_trial_balance`**
**Estado Anterior:** ❌ No existía  
**Estado Actual:** ✅ Implementado

**Propósito:** Verifica que las cuentas tengan saldos coherentes según PGC

**Uso:**
```typescript
const { data, error } = await supabase.rpc('validate_trial_balance', {
  p_fiscal_year_id: 'uuid-del-ejercicio'
});

// data → array de cuentas con saldos
```

**Retorna:**
```typescript
interface TrialBalanceAccount {
  account_code: string;
  account_name: string;
  total_debit: number;
  total_credit: number;
  balance: number;
  balance_type: 'deudor' | 'acreedor' | 'saldado';
  expected_balance_type: 'deudor' | 'acreedor' | 'variable';
  is_valid: boolean;
  warning: string | null;
}
```

**Lógica de Validación:**
| Grupo PGC | Naturaleza Esperada |
|-----------|---------------------|
| 1, 2, 3, 5, 6 | Deudor |
| 4, 7, 8, 9 | Acreedor |

---

### 5️⃣ **RPC: `validate_vat_reconciliation`**
**Estado Anterior:** ❌ No existía  
**Estado Actual:** ✅ Implementado

**Propósito:** Reconcilia IVA de facturas con IVA contabilizado

**Uso:**
```typescript
const { data, error } = await supabase.rpc('validate_vat_reconciliation', {
  p_fiscal_year_id: 'uuid-del-ejercicio',
  p_centro_code: 'CENTRO_001'
});
```

**Retorna:**
```typescript
interface VATReconciliation {
  vat_type: 'repercutido' | 'soportado';
  rate: number;                    // 0, 4, 10, 21
  issued_amount: number;           // De facturas emitidas
  received_amount: number;         // De facturas recibidas
  accounting_amount: number;       // De cuentas 477x / 472x
  difference: number;
  is_valid: boolean;
  message: string;
}
```

**Criterio de Validación:**
- ✅ Válido si diferencia < 1€

---

### 6️⃣ **RPC: `validate_entry_sequence`**
**Estado Anterior:** ❌ No existía  
**Estado Actual:** ✅ Implementado

**Propósito:** Detecta huecos y duplicados en numeración de asientos

**Uso:**
```typescript
const { data, error } = await supabase.rpc('validate_entry_sequence', {
  p_fiscal_year_id: 'uuid-del-ejercicio'
});

// data[0] → { min_number, max_number, missing_numbers[], duplicate_numbers[], is_valid, message }
```

**Criterio de Validación:**
- ✅ Válido si no hay huecos ni duplicados
- ⚠️ Advertencia si detecta números faltantes
- ❌ Error si detecta números duplicados

---

### 7️⃣ **Correcciones en `supabase-queries.ts`**
**Estado Anterior:** ❌ Referencias a tablas inexistentes  
**Estado Actual:** ✅ Referencias corregidas

**Cambios:**
```typescript
// ❌ ANTES
.from("journal_entries" as any)  →  ✅ .from("accounting_entries" as any)
.from("periods" as any)           →  ✅ .from("fiscal_years" as any)
.eq("period_id", periodId)        →  ✅ .eq("fiscal_year_id", periodId)
```

**Archivos Afectados:**
- ✅ `src/lib/supabase-queries.ts` (líneas 243-280)

---

## 🚀 Instrucciones de Aplicación

### Paso 1: Ejecutar Migración en Supabase
1. Abre el **SQL Editor** en tu proyecto Supabase
2. Copia el contenido de `MIGRATION_SQL_ACCOUNTING_CORRECTIONS.sql`
3. Ejecuta la migración
4. Verifica que aparezca: ✅ **Migración completada exitosamente**

### Paso 2: Regenerar Tipos de TypeScript
```bash
npx supabase gen types typescript --project-id <tu-project-id> > src/integrations/supabase/types.ts
```

### Paso 3: Verificar Funcionamiento
```typescript
// Test 1: Consultar períodos de cierre
const { data: periods } = await supabase.rpc('get_closing_periods', {
  p_year: 2024
});
console.log('Períodos:', periods);

// Test 2: Validar balance
const { data: balance } = await supabase.rpc('validate_fiscal_year_balance', {
  p_fiscal_year_id: 'uuid-ejercicio'
});
console.log('Balance válido:', balance[0].is_valid);

// Test 3: Usar hook React
const { data: validations } = useAdvancedValidations(
  'uuid-ejercicio',
  'CENTRO_001'
);
```

---

## ✅ Checklist Post-Migración

### Base de Datos
- [ ] Tabla `closing_periods` creada
- [ ] 5 RPCs implementados (`get_closing_periods`, `validate_*`)
- [ ] Políticas RLS aplicadas
- [ ] Índices creados

### Frontend
- [ ] Referencias legacy corregidas en `supabase-queries.ts`
- [ ] Hook `useClosingPeriods` funciona sin errores
- [ ] Hook `useAdvancedValidations` ejecuta correctamente
- [ ] Tipos TypeScript regenerados

### Testing
- [ ] Crear período de cierre → `useClosePeriod.mutate()`
- [ ] Consultar períodos → `useClosingPeriods(2024)`
- [ ] Ejecutar validaciones → `useAdvancedValidations()`
- [ ] Verificar warnings en consola (deben desaparecer)

---

## 🐛 Solución de Problemas

### Problema: "RPC 'get_closing_periods' no existe"
**Solución:** Ejecutar la migración SQL completa

### Problema: "Tabla 'closing_periods' no encontrada"
**Solución:** Verificar que la migración se ejecutó correctamente

### Problema: Tipos TypeScript incorrectos
**Solución:** Regenerar tipos con `npx supabase gen types`

### Problema: RLS bloquea consultas
**Solución:** Verificar que el usuario tenga acceso al centro mediante `v_user_centres`

---

## 📊 Impacto Esperado

### Antes (Estado Crítico)
- ❌ `useClosingPeriods()` → Error: tabla no existe
- ❌ `useAdvancedValidations()` → Error: 4 RPCs no existen
- ❌ Sistema de cierres contables no funcional
- ❌ Referencias a `journal_entries` inexistente

### Después (Estado Funcional)
- ✅ Sistema de cierres contables completo
- ✅ Validaciones avanzadas operativas
- ✅ Histórico de cierres por centro y período
- ✅ Código limpio sin referencias legacy
- ✅ Cumplimiento normativo de cierres mensuales/anuales

---

## 📖 Referencias

- **Plan General Contable:** https://www.icac.gob.es/
- **Documentación Supabase RLS:** https://supabase.com/docs/guides/auth/row-level-security
- **Lovable Prompting Guide:** https://docs.lovable.dev/prompting/prompting-one

---

**Autor:** AI Assistant  
**Fecha:** 2025-01-15  
**Versión:** 1.0.0
