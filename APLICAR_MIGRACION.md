# 🚀 Instrucciones: Aplicar Migración de Correcciones Contables

## ⚠️ IMPORTANTE
Esta migración **debe ejecutarse manualmente** en el SQL Editor de Supabase. No se puede aplicar automáticamente.

---

## 📋 Pasos para Aplicar la Migración

### 1️⃣ Abrir SQL Editor en Supabase
1. Accede a tu proyecto en https://supabase.com/dashboard
2. Ve a la sección **SQL Editor** en el menú lateral
3. Crea una nueva query

### 2️⃣ Copiar la Migración
1. Abre el archivo: `MIGRATION_SQL_ACCOUNTING_CORRECTIONS.sql`
2. Copia **TODO** el contenido del archivo
3. Pégalo en el SQL Editor de Supabase

### 3️⃣ Ejecutar la Migración
1. Haz clic en **Run** o presiona `Ctrl+Enter`
2. Espera a que termine la ejecución (puede tomar 10-30 segundos)
3. Verifica que aparezca el mensaje:
   ```
   ✅ Migración completada exitosamente
      - Tabla closing_periods: OK
      - RPC get_closing_periods: OK
      - RPC validate_fiscal_year_balance: OK
      - RPC validate_trial_balance: OK
      - RPC validate_vat_reconciliation: OK
      - RPC validate_entry_sequence: OK
      - Políticas RLS: OK
   ```

### 4️⃣ Verificar en la Base de Datos
Ejecuta estos comandos para confirmar que todo se creó:

```sql
-- Verificar tabla
SELECT * FROM closing_periods LIMIT 1;

-- Verificar RPCs (deben aparecer)
SELECT proname FROM pg_proc 
WHERE proname IN (
  'get_closing_periods',
  'validate_fiscal_year_balance',
  'validate_trial_balance',
  'validate_vat_reconciliation',
  'validate_entry_sequence'
);
```

---

## 🎯 ¿Qué hace esta migración?

### 1. Crea Tabla `closing_periods`
Registra cierres contables mensuales y anuales por centro.

### 2. Crea 5 RPCs (Remote Procedure Calls)
- `get_closing_periods` → Consultar períodos de cierre
- `validate_fiscal_year_balance` → Validar Debe = Haber
- `validate_trial_balance` → Validar balance de sumas y saldos
- `validate_vat_reconciliation` → Reconciliar IVA
- `validate_entry_sequence` → Detectar huecos en numeración

### 3. Aplica Políticas RLS
Garantiza que cada usuario solo vea datos de sus centros autorizados.

---

## ✅ Testing Post-Migración

### Test 1: Consultar Períodos de Cierre
Ejecuta en el SQL Editor:
```sql
SELECT * FROM get_closing_periods(NULL, 2024);
```

### Test 2: Validar Balance de un Ejercicio
```sql
-- Primero obtén un fiscal_year_id
SELECT id, name FROM fiscal_years LIMIT 1;

-- Luego valida (reemplaza el UUID)
SELECT * FROM validate_fiscal_year_balance('uuid-aqui');
```

### Test 3: Desde el Frontend
Una vez aplicada la migración, ejecuta en la consola del navegador:
```javascript
const { data, error } = await supabase.rpc('get_closing_periods', {
  p_year: 2024
});
console.log('Períodos:', data);
```

---

## 🐛 Solución de Problemas

### Error: "relation 'closing_periods' already exists"
**Causa:** La tabla ya fue creada previamente  
**Solución:** La migración es **idempotente**, simplemente continúa. Los `CREATE TABLE IF NOT EXISTS` evitarán errores.

### Error: "function already exists"
**Causa:** Los RPCs ya fueron creados previamente  
**Solución:** La migración usa `CREATE OR REPLACE FUNCTION`, así que sobrescribirá las versiones anteriores.

### Error: "permission denied"
**Causa:** Tu usuario no tiene permisos de administrador  
**Solución:** Debes ejecutar esto con una cuenta de **owner** del proyecto Supabase.

### Los hooks React siguen fallando
**Causa:** Los tipos TypeScript no se regeneraron  
**Solución:**
```bash
npx supabase gen types typescript --project-id <tu-project-id> > src/integrations/supabase/types.ts
```

---

## 📚 Documentación Adicional

Lee la guía completa en: `docs/ACCOUNTING_CORRECTIONS_GUIDE.md`

---

## ⏱️ Tiempo Estimado
- **Ejecución:** 30 segundos
- **Verificación:** 2 minutos
- **Total:** < 5 minutos

---

**¿Necesitas ayuda?** Revisa la guía completa o pregunta en el chat.
