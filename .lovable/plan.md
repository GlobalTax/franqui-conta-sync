

# Plan: Fix error 400 en `pl-rubric-breakdown`

## Root Cause

La función RPC `get_pl_rubric_breakdown` **no existe en la base de datos**. El archivo SQL en `supabase/APPLY_PL_RUBRIC_BREAKDOWN_RPC.sql` nunca se ejecutó como migración — es solo un archivo suelto.

Cuando la edge function llama a `supabase.rpc('get_pl_rubric_breakdown', ...)`, Supabase devuelve un error porque la función no existe, y la edge function lo re-lanza como 400.

## Solución

Crear una migración que aplique el RPC. Las dependencias ya existen:
- ✅ `v_pl_rule_winner` (vista) — columnas: `template_id, company_id, centro_code, period_month, account_code, rubric_code, priority`
- ✅ `mv_gl_ledger_month` (materialized view) — columnas: `company_id, centro_code, period_month, account_code, amount`
- ✅ `pl_templates`, `pl_rubrics`, `pl_rules`, `accounts` — tablas existentes

## Cambio

| Archivo | Acción |
|---------|--------|
| Migración (nueva) | Crear la función RPC `get_pl_rubric_breakdown` usando el SQL ya definido en `APPLY_PL_RUBRIC_BREAKDOWN_RPC.sql` |

El SQL es el mismo del archivo existente: `CREATE OR REPLACE FUNCTION get_pl_rubric_breakdown(...)` con los grants correspondientes.

