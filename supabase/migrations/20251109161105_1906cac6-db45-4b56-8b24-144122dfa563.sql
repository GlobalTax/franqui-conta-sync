-- ============================================================================
-- MIGRACIÓN: Permisos P&L y eliminación de sobrecarga de calculate_pl_report
-- ============================================================================

-- Paso 1: GRANT en esquema y tablas
GRANT USAGE ON SCHEMA public TO authenticated, anon;

-- Tablas catálogo (solo lectura)
GRANT SELECT ON TABLE public.pl_templates TO authenticated, anon;
GRANT SELECT ON TABLE public.pl_rubrics TO authenticated, anon;
GRANT SELECT ON TABLE public.pl_rules TO authenticated, anon;

-- Ajustes manuales (lectura/escritura para authenticated; RLS ya limita)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.pl_manual_adjustments TO authenticated;

-- Vistas/materialized
GRANT SELECT ON TABLE public.mv_gl_ledger_month TO authenticated;
GRANT SELECT ON TABLE public.v_pl_rule_winner TO authenticated;
GRANT SELECT ON TABLE public.v_pl_rubric_month TO authenticated;

-- Paso 2: Eliminar la sobrecarga TEXT de calculate_pl_report para evitar error 300
DROP FUNCTION IF EXISTS public.calculate_pl_report(text, uuid, text, text, text);

-- Paso 3: GRANT EXECUTE en funciones RPC con firmas correctas
GRANT EXECUTE ON FUNCTION public.calculate_pl_report(text, uuid, text, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_pl_report_consolidated(text, text[], text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_pl_report_accumulated(text, date, uuid, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_pl_report_with_adjustments(text, uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unmapped_accounts(text, uuid, text, date) TO authenticated;

-- Paso 4: Refrescar el materialized view para asegurar datos actualizados
REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_gl_ledger_month;