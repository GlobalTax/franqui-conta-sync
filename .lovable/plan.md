

# Ya implementado: Subida batch de facturas

El componente solicitado ya existe en el proyecto con todas las funcionalidades pedidas:

## Componentes existentes

| Archivo | Funcionalidad |
|---------|--------------|
| `src/components/invoices/bulk/BulkInvoiceUploader.tsx` | Dropzone multi-archivo, lista de archivos con estado, progreso visual, stats dashboard |
| `src/hooks/useBulkInvoiceUpload.ts` | Cola de procesamiento en batches de 3, hash SHA-256, validacion, Claude Vision OCR |
| `src/pages/invoices/BulkInvoiceUpload.tsx` | Pagina `/invoices/bulk-upload` |

## Funcionalidades ya implementadas

1. **Dropzone** — react-dropzone con drag & drop, hasta 50 archivos PDF, max 10MB
2. **Cola secuencial** — Procesamiento en batches de 3 con `Promise.all`
3. **Progreso visual** — Barra de progreso individual por archivo + progreso general del lote
4. **Deduplicacion** — Hash SHA-256 antes de subir, check contra `invoices_received`
5. **Stats dashboard** — Total, completados, revision, errores, coste OCR, tiempo medio
6. **Gestion de cola** — Limpiar completados, limpiar errores, limpiar todo
7. **Navegacion** — Boton "Ver" para ir al detalle de cada factura procesada
8. **Cards de resultado** — Exito total (verde) o parcial con errores (amarillo)

## Proximos pasos sugeridos

En lugar de reimplementar algo existente, se podrian mejorar:

1. **Retry automatico** — Reintentar archivos con error sin tener que re-subirlos
2. **Drag reorder** — Reordenar prioridad de archivos en la cola
3. **Filtros en la lista** — Mostrar solo pendientes/errores/completados
4. **Notificacion al completar** — Browser notification cuando el lote termine
5. **Estimacion de tiempo** — Calcular ETA basado en tiempo medio de procesamiento

