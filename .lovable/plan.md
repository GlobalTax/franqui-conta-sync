

# Analisis completo de funcionalidades — FranquiContaSync

## Arquitectura general

Suite contable multiempresa/multicentro para franquiciados McDonald's con React + Supabase. 42 Edge Functions, 120+ hooks, 80+ paginas.

---

## Modulos funcionales (estado actual)

### 1. DASHBOARD (`/`)
- KPIs: ventas dia, coste laboral, margen neto
- Grafico ventas por canal (drive-thru, sala, delivery, McAuto)
- Card tesoreria (saldo bancario + arqueo caja)
- Incidencias activas
- Resumen IVA
- Card "Mis Restaurantes"
- Card acceso rapido OCR

**Mejoras posibles**: No tiene selector de periodo (mes/semana), no muestra tendencia vs periodo anterior, falta comparativa entre centros.

### 2. DIGITALIZACION / OCR (`/digitalizacion`)
- 6 pestanas: Inbox, Nueva factura, Carga masiva, Depura, Papelera, Validacion
- Claude Vision para OCR de facturas (Edge Function `claude-invoice-ocr`)
- Auto-matching de proveedores por NIF
- AP Mapping automatico (cuentas contables)
- Subida batch hasta 50 PDFs simultaneos
- Gestion de duplicados (hash SHA-256)
- Truncamiento PDF a 5 paginas para tokens

**Mejoras posibles**: No hay vista previa del PDF junto al formulario de edicion, no hay workflow de aprobacion multi-nivel, falta indicador de coste acumulado OCR en dashboard.

### 3. FACTURAS RECIBIDAS (`/invoices`)
- Listado con filtros por estado, proveedor, fecha
- Editor de detalle con campos OCR
- Estados: draft, pending, ocr_review, approved, rejected, posted
- Acciones bulk (aprobar, rechazar)

**Mejoras posibles**: No hay vista split (PDF izquierda + datos derecha), busqueda de texto completo limitada.

### 4. FACTURAS EMITIDAS (`/facturas/emitidas`)
- Creacion manual de facturas emitidas
- Listado basico

**Mejoras posibles**: Falta generacion de PDF de factura, series de numeracion automatica, envio por email.

### 5. PROVEEDORES (`/proveedores`)
- CRUD de proveedores
- Validacion NIF/CIF
- Auto-creacion desde OCR
- Enriquecimiento de datos via API

**Mejoras posibles**: Falta ficha completa con historico de facturas, condiciones de pago por proveedor, estadisticas de gasto.

### 6. TESORERIA
- **Bancos** (`/banks`): Cuentas bancarias, movimientos
- **Conciliacion** (`/treasury/reconciliation`): Matching banco-contabilidad con reglas
- **Conexiones bancarias** (`/treasury/salt-edge-connections`): SaltEdge + Ponto (Open Banking)
- **Norma 43**: Importacion de extractos bancarios

**Mejoras posibles**: Falta prevision de tesoreria (cash flow forecast), alertas de saldo minimo, conciliacion automatica con IA.

### 7. CONTABILIDAD
- **Asientos contables** (`/contabilidad/apuntes`): Diario general
- **Plan de cuentas** (`/accounts`): PGC espanol 7 digitos
- **Cierre diario** (`/contabilidad/cierre-diario`)
- **Costes laborales** (`/contabilidad/costes-laborales`)
- **Cierre ejercicio** (`/contabilidad/cierre-ejercicio`)
- **Ejercicios historicos**: Importacion de datos de anos anteriores
- **Activos fijos**: Registro + amortizacion automatica
- **Periodificaciones**: Gastos anticipados/diferidos
- **Provisiones**: Plantillas + posting automatico
- **Asiento existencias**: Cierre de inventario

**Mejoras posibles**: No hay asistente de asientos (wizard paso a paso), falta bloqueo visual de periodos cerrados en el calendario, no hay reconciliacion de saldos de apertura.

### 8. IVA
- Libro IVA repercutido (expedidas)
- Libro IVA soportado (recibidas)
- Modelo 303 (autoliquidacion trimestral)

**Mejoras posibles**: Falta Modelo 390 (resumen anual), SII (Suministro Inmediato de Informacion), validaciones cruzadas libro-modelo.

### 9. INFORMES
- P&L individual y consolidado
- Sumas y Saldos
- Balance de Situacion
- Libro Mayor
- Libro Diario
- Consolidado multi-centro
- Libro de Bienes (activos)
- Plantillas de balance personalizables

**Mejoras posibles**: Falta exportacion a Excel con formato profesional para todos los reportes, comparativa interanual, graficos de evolucion mensual en cada informe.

### 10. CUMPLIMIENTO
- Dashboard de auditoria & compliance
- Cadena de integridad SHA-256 (Verifactu)
- Modelos fiscales
- Log de auditoria inmutable

**Mejoras posibles**: Falta generacion automatica de ficheros XML Verifactu, alertas proactivas de vencimientos fiscales.

### 11. ADMINISTRACION (`/admin`)
- 15 pestanas: Testing, P&L mapping, Usuarios, Roles, Franchisees, Sociedades, Centros, Orquest, Permisos, Alertas, Calidad datos, Dashboard DQ, Auditoria, API Keys, Config
- Generador de datos demo
- Gestion de invitaciones por email
- Roles: admin, gestor, franquiciado, empleado

**Mejoras posibles**: Panel demasiado denso (15 tabs), falta agrupacion logica, la UX de gestion de usuarios podria simplificarse.

### 12. IA / ASISTENTE (`/ai-assistant`)
- Chat con Claude para consultas contables
- AP Learning (aprendizaje de patrones de contabilizacion)

**Mejoras posibles**: No esta integrado contextualmente (no sugiere acciones desde facturas o asientos).

### 13. EDGE FUNCTIONS (42 funciones)
Cubren: OCR, posting contable, conciliacion, importaciones, validaciones fiscales, sync bancario, IA, PDF operations.

---

## Problemas transversales detectados

| Area | Problema |
|------|----------|
| **Navegacion** | Sidebar con demasiados items (30+), dropdowns para IVA e Informes se pierden, no hay busqueda rapida visible |
| **Responsive** | Sidebar fija de 264px, no colapsa en movil |
| **Tipografia** | Recien migrada a GeneralSans, posibles inconsistencias residuales |
| **Rendimiento** | Dashboard carga todo al montar (no lazy por seccion), queries de 1000 registros para conteos |
| **UX** | No hay onboarding para nuevos usuarios, no hay empty states informativos en todos los modulos |
| **Datos** | Selector de ejercicio fiscal hardcodeado (2023/2024/2025), no conectado a `fiscal_years` de BD |

---

## Top 10 mejoras sugeridas (por impacto)

1. **Sidebar colapsable + busqueda** — Reorganizar navegacion en grupos colapsables con buscador integrado
2. **Vista split PDF+datos en facturas** — Editor de factura con preview del documento al lado
3. **Dashboard con periodo seleccionable** — Comparativa mes actual vs anterior, filtro por semana/mes/trimestre
4. **Selector de ejercicio fiscal dinamico** — Conectar a tabla `fiscal_years` real, no hardcoded
5. **Empty states informativos** — Guiar al usuario cuando no hay datos en cada modulo
6. **Exportacion Excel profesional** — Todos los informes con formato, cabeceras y totales
7. **Workflow de aprobacion visual** — Kanban o pipeline para facturas (draft > review > approved > posted)
8. **Ficha de proveedor completa** — Historico, estadisticas, condiciones de pago
9. **Responsive / mobile** — Sidebar como drawer en movil, tablas adaptativas
10. **Onboarding wizard** — Guia paso a paso para configurar empresa, centros, plan de cuentas y primer ejercicio

Dime por cual quieres empezar o si prefieres priorizar otra area.

