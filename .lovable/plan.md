
## Qué está pasando realmente

Sí sé cuál es el problema actual.

El error ya no está en Claude ni en el parseo OCR. El flujo se rompe antes, en la creación automática del borrador desde `Nueva Factura`.

### Evidencia encontrada
En consola aparece:

```text
[OCR] No hay ID, creando borrador automático...
[OCR] ❌ Error creando borrador:
column "row_id" is of type uuid but expression is of type text
```

Eso significa que:

1. `handleProcessOCR()` intenta insertar un borrador en `invoices_received`
2. esa inserción dispara lógica secundaria de auditoría/trigger
3. esa lógica intenta escribir en `audit_logs.row_id`
4. `row_id` es `uuid`, pero se le está pasando un valor tratado como `text`
5. por eso el insert falla y nunca llega a ejecutarse `claude-invoice-ocr`

## Archivos implicados

### Confirmados
- `src/pages/invoices/InvoiceDetailEditor.tsx`
- `src/components/invoices/InvoicePDFUploader.tsx`

### Probables en backend/db
- migraciones donde exista lógica de auditoría sobre `invoices_received`
- definición de `audit_logs` / función RPC o trigger que escriba `row_id`

## Problemas de diseño detectados

### 1. El borrador se crea tarde y en el sitio equivocado
Ahora se crea dentro de `handleProcessOCR()`. Eso hace que:
- subir PDF
- lanzar OCR
- crear borrador
- y ejecutar triggers

ocurra todo mezclado en un mismo paso, dificultando control y errores.

### 2. El uploader sigue usando `invoiceId={id}` y no `effectiveId`
En `InvoiceDetailEditor.tsx`, tanto en desktop como mobile:
- `InvoicePDFUploader` recibe `invoiceId={id}`
- pero cuando la factura es nueva, `id` no existe
- aunque luego se cree `createdInvoiceId`, el uploader no queda alineado con ese ID efectivo

### 3. El flujo “Nueva factura” y “Carga masiva” no están unificados
La carga masiva ya crea primero el registro y luego llama al OCR.
La pantalla nueva intenta hacerlo “al vuelo”, con más riesgo de estados rotos.

## Plan de corrección

### Fase 1 — Rehacer el alta nueva para que cree el borrador antes del OCR
Mover la creación del registro borrador al momento correcto del flujo:

- al terminar la subida del PDF
- o en una función dedicada `ensureDraftInvoice()`
- antes de intentar OCR

El objetivo es:
```text
Subir PDF → crear borrador válido → guardar createdInvoiceId → actualizar document_path → lanzar OCR con ID real
```

### Fase 2 — Corregir el payload del borrador
Alinear el insert mínimo del borrador con el esquema real de `invoices_received`, usando los mismos campos válidos que ya funcionan en carga masiva.

Revisaré y ajustaré especialmente:
- `invoice_number`
- `invoice_date`
- `total`
- `status`
- `approval_status`
- `file_path`
- `document_path`
- `uploaded_by`
- `uploaded_at`
- `created_by`

La idea es dejar un insert mínimo, consistente y auditable.

### Fase 3 — Corregir el origen del error UUID/text
Localizar la lógica exacta que escribe en `audit_logs.row_id` y corregirla para que use UUID real, no texto.

Haré una de estas dos correcciones según lo que exista en la DB:
- castear correctamente a `uuid`
- o dejar de enviar valores textuales/temporales como `row_id`

Sin arreglar esto, cualquier inserción nueva seguirá rompiéndose.

### Fase 4 — Hacer que el uploader use siempre el ID efectivo
Actualizar `InvoiceDetailEditor.tsx` para pasar:
- `invoiceId={effectiveId}`

en lugar de:
- `invoiceId={id}`

tanto en desktop como en mobile.

Así, cuando ya exista `createdInvoiceId`, el uploader podrá actualizar correctamente `document_path` sobre el mismo registro.

### Fase 5 — Unificar el flujo con el patrón de carga masiva
Tomar como referencia el patrón funcional de `useBulkInvoiceUpload.ts`:

```text
1. subir archivo
2. crear registro en invoices_received
3. guardar id
4. invocar claude-invoice-ocr
```

y reutilizar esa lógica conceptual para `Nueva Factura`, evitando dos implementaciones distintas del mismo proceso.

### Fase 6 — Endurecer el manejo de errores en UI
Si falla la creación del borrador:
- mostrar toast específico del motivo real
- no dejar la pantalla en estado ambiguo
- no mostrar “OCR procesado” si nunca se invocó la edge function

## Resultado esperado tras el arreglo

```text
Nueva Factura
  ↓
Subida del PDF
  ↓
Creación correcta del borrador en invoices_received
  ↓
Asignación de createdInvoiceId
  ↓
Invocación de claude-invoice-ocr con invoice_id real
  ↓
Relleno automático del formulario
```

## Cambios previstos

| Archivo | Cambio |
|---|---|
| `src/pages/invoices/InvoiceDetailEditor.tsx` | Rehacer flujo de alta nueva, creación temprana del borrador, usar `effectiveId`, lanzar OCR solo con ID real |
| `src/components/invoices/InvoicePDFUploader.tsx` | Mantenerlo alineado con `effectiveId` y evitar estados inconsistentes |
| SQL / trigger / función de auditoría relacionada | Corregir incompatibilidad `audit_logs.row_id (uuid)` vs valor textual |

## Nota importante
Ahora mismo el problema principal no es “Claude no lee”, sino este:

```text
la factura nueva ni siquiera consigue insertarse correctamente en invoices_received
porque una auditoría/trigger rompe el insert con un mismatch uuid/text
```

Hasta corregir eso, el OCR seguirá pareciendo que “no funciona” aunque el motor esté bien.
