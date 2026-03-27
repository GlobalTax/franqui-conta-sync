

# Plan: Corregir error "No se pudo determinar el ID de la factura" en tab Nueva

## Problema

Cuando `InvoiceDetailEditor` se usa desde `/digitalizacion?tab=nueva`, no hay parámetro `:id` en la URL (solo existe en `/invoices/received/:id/edit`). Al subir un PDF y auto-disparar OCR, `id` es `undefined` y el OCR falla.

## Solución

Añadir un estado `createdInvoiceId` al componente. Antes de invocar OCR, si no hay `id` de URL, **crear automáticamente un registro borrador** en `invoices_received` (con status `draft`) y usar ese ID para el OCR. Si el registro ya fue creado, reutilizar el ID existente.

## Cambios en `src/pages/invoices/InvoiceDetailEditor.tsx`

1. **Nuevo estado**: `const [createdInvoiceId, setCreatedInvoiceId] = useState<string | null>(null)`
2. **ID efectivo**: `const effectiveId = id || createdInvoiceId` — usar en todo el componente donde se use `id`
3. **En `handleProcessOCR`**: Si no hay `effectiveId`, crear registro borrador en DB antes de invocar OCR:
   - Insert en `invoices_received` con status `'draft'`, file_path, centro_code, y valores placeholder
   - Guardar el ID retornado en `createdInvoiceId`
   - Continuar con el flujo OCR normal usando ese ID
4. **En `handleUploadComplete`**: Pasar el `createdInvoiceId` al flujo OCR
5. **En submit/save**: Si hay `createdInvoiceId`, hacer `update` en vez de `insert` (ya existe el registro)

## Archivos

| Archivo | Cambio |
|---------|--------|
| `src/pages/invoices/InvoiceDetailEditor.tsx` | Añadir auto-creación de borrador pre-OCR |

