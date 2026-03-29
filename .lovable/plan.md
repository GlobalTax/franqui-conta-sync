

# Plan: Fix build error en pdf-export.ts

## Problema
La línea 1 `import type jsPDF from "jspdf"` importa el tipo pero no se usa directamente en ninguna declaración de tipo del archivo (las funciones usan `import()` dinámico). Esto puede causar conflictos con la resolución de `autoTable`.

## Solución
Eliminar la línea 1 (`import type jsPDF from "jspdf"`). Las funciones ya importan jsPDF dinámicamente con `await import("jspdf")`. Mantener la línea 2 `import "jspdf-autotable"` como side-effect import.

## Archivo
- **`src/lib/pdf-export.ts`** — eliminar línea 1

