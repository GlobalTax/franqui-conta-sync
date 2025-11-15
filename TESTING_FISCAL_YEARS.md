# 🧪 Plan de Testing - Ejercicios Fiscales

## ✅ FASE 1: Migración de Ejercicios Fiscales 2025
**Estado**: ✅ Completado

### Verificación SQL
```sql
-- Verificar que se crearon ejercicios fiscales para 2025
SELECT 
  fy.year,
  fy.status,
  c.codigo as centro_code,
  c.nombre as centro_name,
  fy.start_date,
  fy.end_date
FROM fiscal_years fy
JOIN centres c ON c.codigo = fy.centro_code
WHERE fy.year = 2025
ORDER BY c.codigo;
```

**Resultado Esperado**: Debe mostrar ejercicios fiscales 2025 con estado "open" para todos los centros activos.

---

## ✅ FASE 2: Interfaz de Gestión de Ejercicios Fiscales
**Estado**: ✅ Completado

### Test Case 2.1: Acceder a la página de ejercicios fiscales
1. Navegar a `/contabilidad/ejercicios-fiscales`
2. **Resultado esperado**: 
   - Se muestra la página con título "Ejercicios Fiscales"
   - Hay un selector de centro
   - Si no hay centro seleccionado, muestra un mensaje

### Test Case 2.2: Ver ejercicios fiscales de un centro
1. Seleccionar un centro del filtro
2. **Resultado esperado**:
   - Se muestra la lista de ejercicios fiscales para ese centro
   - Cada ejercicio muestra: año, fechas, estado (Abierto/Cerrado)
   - Los ejercicios abiertos tienen un botón "Cerrar Ejercicio"

### Test Case 2.3: Crear nuevo ejercicio fiscal
1. Seleccionar un centro
2. Click en "Crear Ejercicio Fiscal"
3. Ingresar año (ej: 2026)
4. Click en "Crear"
5. **Resultado esperado**:
   - Toast de éxito: "Ejercicio fiscal creado correctamente"
   - El nuevo ejercicio aparece en la lista con estado "Abierto"

### Test Case 2.4: Cerrar ejercicio fiscal
1. Seleccionar un centro con ejercicio abierto
2. Click en "Cerrar Ejercicio" en un ejercicio abierto
3. Confirmar en el diálogo
4. **Resultado esperado**:
   - Toast de éxito: "Ejercicio fiscal cerrado correctamente"
   - El ejercicio cambia a estado "Cerrado"
   - Ya no aparece el botón "Cerrar Ejercicio"

---

## ✅ FASE 3: Mejoras UX en Creación de Asientos
**Estado**: ✅ Completado

### Test Case 3.1: Alerta de ejercicio fiscal faltante
1. Navegar a `/contabilidad/nuevo-asiento`
2. Seleccionar un centro que NO tiene ejercicio fiscal abierto
3. **Resultado esperado**:
   - Se muestra una alerta amarilla/ámbar con el mensaje:
     - Título: "No hay ejercicio fiscal abierto"
     - Descripción: "Para crear asientos contables, primero debes crear un ejercicio fiscal para este centro."
     - Enlace clickeable a `/contabilidad/ejercicios-fiscales`

### Test Case 3.2: Crear ejercicio fiscal desde el enlace
1. Desde la alerta en `/contabilidad/nuevo-asiento`, click en el enlace "crear un ejercicio fiscal"
2. **Resultado esperado**:
   - Navega a `/contabilidad/ejercicios-fiscales`
3. Crear un ejercicio fiscal para el centro
4. Volver a `/contabilidad/nuevo-asiento`
5. **Resultado esperado**:
   - La alerta ya NO se muestra
   - El formulario de asiento está disponible

### Test Case 3.3: Mensaje de error mejorado en use case
1. Intentar crear un asiento para un centro sin ejercicio fiscal (a través de API)
2. **Resultado esperado**:
   - Error con mensaje claro:
     ```
     No hay ejercicio fiscal abierto para el centro XXX. 
     Por favor, crea un ejercicio fiscal en Contabilidad > Ejercicios Fiscales antes de crear asientos.
     ```

---

## ✅ FASE 4: Testing de Regresión
**Estado**: ⏳ Pendiente de testing manual

### Test Case 4.1: Flujo completo - Crear ejercicio y asiento
1. Navegar a `/contabilidad/ejercicios-fiscales`
2. Seleccionar centro "10"
3. Verificar que existe ejercicio 2025 abierto
4. Navegar a `/contabilidad/nuevo-asiento`
5. Seleccionar mismo centro "10"
6. Verificar que NO aparece alerta (hay ejercicio abierto)
7. Crear un asiento:
   - Fecha: 2025-11-15
   - Descripción: "Test asiento post-migración"
   - Líneas:
     - Debe: 100 € cuenta 6000000 (Compras)
     - Haber: 100 € cuenta 4100000 (Acreedores)
8. **Resultado esperado**:
   - Asiento se crea correctamente
   - Redirección a `/contabilidad/apuntes`
   - El asiento aparece en la lista

### Test Case 4.2: Verificar asiento en base de datos
```sql
SELECT 
  ae.entry_number,
  ae.entry_date,
  ae.description,
  ae.centro_code,
  ae.status,
  ae.total_debit,
  ae.total_credit,
  at.account_code,
  at.movement_type,
  at.amount
FROM accounting_entries ae
JOIN accounting_transactions at ON at.entry_id = ae.id
WHERE ae.centro_code = '10'
  AND ae.description LIKE '%Test asiento%'
ORDER BY ae.created_at DESC, at.line_number;
```

**Resultado esperado**:
- entry_number: Número secuencial válido
- total_debit = total_credit = 100
- status: 'draft'
- 2 transacciones (1 debe, 1 haber)

---

## 📊 CRITERIOS DE ÉXITO

✅ **Migración**: Ejercicios fiscales 2025 creados para todos los centros activos  
✅ **Interfaz**: Página `/contabilidad/ejercicios-fiscales` funcional con CRUD completo  
✅ **UX**: Alerta clara en `/contabilidad/nuevo-asiento` cuando falta ejercicio fiscal  
✅ **Enlaces**: Link directo desde alerta a gestión de ejercicios fiscales  
⏳ **Testing**: Flujo completo de creación de ejercicio → asiento funciona sin errores  

---

## 🚀 PRÓXIMOS PASOS SUGERIDOS

1. **Testing Manual**: Ejecutar Test Cases 4.1 y 4.2
2. **Documentación**: Actualizar guía de usuario con nueva funcionalidad
3. **Seguridad**: Verificar políticas RLS en `fiscal_years` (ya existe RLS)
4. **Mejoras Futuras**:
   - Validación: No permitir crear asientos fuera del rango de fechas del ejercicio fiscal
   - Automatización: Crear ejercicio fiscal automáticamente al crear un nuevo centro
   - Notificaciones: Alertar a usuarios cuando un ejercicio está próximo a cerrarse
