

# Plan: Auto-resolver proveedor tras OCR

## Problema

El OCR de Claude extrae correctamente el NIF (B67282871) y la razón social (Glovoapp Spain Platform S.L.), pero el proveedor **no existe en la tabla `suppliers`**. Por eso `supplier_id` queda vacío y aparece el badge "Requerido".

El flujo actual muestra un toast informativo ("Proveedor no encontrado por NIF") pero no ofrece una forma directa de resolver el problema.

## Solución

Cuando el OCR extrae datos de proveedor pero no lo encuentra en BD, **auto-abrir el diálogo de creación de proveedor** con los datos pre-rellenados (NIF + nombre), en lugar de solo mostrar un toast.

## Cambios

### 1. `InvoiceDetailEditor.tsx` — Bloque post-OCR (líneas ~516-518)

Cuando `getSupplierByTaxId` devuelve `null`:
- En vez de solo `toast.info(...)`, llamar a una función que active el diálogo de creación en `InvoiceSupplierSection`
- Pasar el NIF y nombre extraídos como props para pre-rellenar

### 2. `InvoiceSupplierSection.tsx` — Recibir datos OCR para auto-crear

- Añadir props opcionales `ocrTaxId` y `ocrSupplierName`
- Cuando se detecte que hay `ocrTaxId` pero no `supplier_id`, mostrar un **banner/alerta** claro: "Proveedor no registrado — Crear proveedor" con botón directo
- Al hacer click, abrir `SupplierFormDialog` con NIF y nombre pre-rellenados
- Eliminar el badge "Requerido" cuando ya hay datos OCR pendientes de crear (reemplazar por un badge "Pendiente de crear" en amarillo)

### 3. `SupplierFormDialog.tsx` — Aceptar nombre inicial

- Añadir prop `initialName` además de `initialTaxId` para pre-rellenar ambos campos

## Resultado esperado

1. OCR extrae NIF + nombre → no existe en BD
2. Se muestra banner amarillo: "Proveedor Glovoapp Spain Platform S.L. (B67282871) no registrado — [Crear proveedor]"
3. Click → diálogo abre con datos pre-rellenados
4. Al guardar → `supplier_id` se auto-selecciona y desaparece el badge

