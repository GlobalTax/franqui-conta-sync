# Configuración P&L para Centro 1050 (Islazul)

## 📋 Pasos para activar el P&L

### Paso 1: Crear tabla `pl_manual_adjustments` (2 min)

1. Ir al **Dashboard de Supabase** → SQL Editor
2. Abrir el archivo `supabase/migration_create_pl_manual_adjustments_table.sql`
3. Copiar todo el contenido y ejecutarlo
4. Verificar que aparezca: ✅ "Tabla pl_manual_adjustments creada correctamente"

### Paso 2: Cargar datos demo de Islazul (3 min)

1. **Obtener tu user_id real:**
   ```sql
   SELECT id, email FROM auth.users LIMIT 1;
   ```
   
2. **Editar el archivo** `seed_demo_islazul_1050.sql`:
   - Abrir el archivo
   - Ir a la **línea 9**
   - Reemplazar `'00000000-0000-0000-0000-000000000000'` con tu user_id real
   
3. **Ejecutar el seed completo** en SQL Editor
   - Esto creará:
     - ✅ Ejercicio fiscal 2025 para centro 1050
     - ✅ 10 asientos contables (enero 2025)
     - ✅ Transacciones con cuentas PGC (700, 600, 640, 621, etc.)

### Paso 3: Refrescar vista materializada (1 min)

```sql
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_gl_ledger_month;
```

### Paso 4: Verificar en el Frontend (2 min)

1. Ir a `/pnl`
2. Seleccionar:
   - **Centro:** `1050 - Islazul`
   - **Plantilla:** `McD_QSR_v1`
   - **Período:** `Enero 2025`
3. **Resultado esperado:**
   - ✅ P&L con 48 líneas (rubros McD)
   - ✅ Columnas: Mes €, Mes %, Acum €, Acum %
   - ✅ KPIs: PAC, SOI, Resultado Neto
   - ✅ Sin errores 404

---

## 📊 Datos de Prueba Creados

### Asientos Contables (Enero 2025)

| # | Fecha | Descripción | Debe | Haber |
|---|-------|-------------|------|-------|
| 1 | 01-01 | Aportación capital inicial | 100,000 | 100,000 |
| 2 | 05-01 | Compra mobiliario restaurante | 18,150 | 18,150 |
| 3 | 10-01 | Compra mercaderías | 9,680 | 9,680 |
| 4 | 15-01 | Ventas primera quincena | 24,200 | 24,200 |
| 5 | 20-01 | Pago a proveedores | 9,680 | 9,680 |
| 6 | 25-01 | Suministros (luz, agua, gas) | 1,452 | 1,452 |
| 7 | 28-01 | Ventas segunda quincena | 18,150 | 18,150 |
| 8 | 31-01 | Nóminas enero | 15,600 | 15,600 |
| 9 | 31-01 | Alquiler local | 3,630 | 3,630 |
| 10 | 31-01 | Amortización mobiliario | 250 | 250 |

### Resumen P&L Esperado (Enero 2025)

- **Ventas Totales:** 35,000 € (cuentas 700)
- **Coste Mercaderías:** 8,000 € (cuenta 600)
- **Margen Bruto:** 27,000 € (77%)
- **Gastos Personal:** 15,600 € (cuentas 640, 642)
- **Alquiler:** 3,000 € (cuenta 621)
- **Suministros:** 1,200 € (cuenta 628)
- **Amortización:** 250 € (cuenta 681)
- **Resultado Neto:** ~7,000 €

---

## ⚙️ Verificaciones SQL

### Comprobar asientos creados:
```sql
SELECT COUNT(*) as total_asientos
FROM accounting_entries 
WHERE centro_code = '1050' AND status = 'posted';
-- Esperado: 10
```

### Comprobar balance:
```sql
SELECT 
  SUM(CASE WHEN movement_type = 'debit' THEN amount ELSE 0 END) as debe,
  SUM(CASE WHEN movement_type = 'credit' THEN amount ELSE 0 END) as haber
FROM accounting_transactions t
JOIN accounting_entries e ON e.id = t.entry_id
WHERE e.centro_code = '1050';
-- Esperado: debe = haber
```

### Ver cuentas sin mapear:
```sql
SELECT * FROM unmapped_accounts(
  'McD_QSR_v1',  -- template_code
  NULL,          -- company_id
  '1050',        -- centro_code
  '2025-01'      -- period_month
);
```

---

## 🔧 Troubleshooting

### Error: "user_id does not exist"
- Asegúrate de reemplazar el UUID en la línea 9 del seed con un user_id real de `auth.users`

### Error: "centro_code does not exist"
- Verifica que el centro '1050' exista en la tabla `centres`

### No aparecen datos en el P&L
1. Verificar que los asientos tengan `status = 'posted'`
2. Refrescar la vista materializada: `REFRESH MATERIALIZED VIEW mv_gl_ledger_month;`
3. Verificar que existan reglas de mapeo para las cuentas usadas

### Cuentas sin mapear
- Consultar `unmapped_accounts()` para ver qué cuentas no tienen regla
- Agregar reglas en `pl_rules` si es necesario
