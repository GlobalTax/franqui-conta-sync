-- ============================================================================
-- SPRINT 1 - FASE 1.1: FIX SECURITY WARNINGS (Search Path)
-- Objetivo: Resolver 52 warnings de search_path en funciones SQL
-- ============================================================================

-- Fix search_path para TODAS las funciones existentes
-- Esto previene ataques de "search path hijacking"

ALTER FUNCTION public.update_updated_at_servicios_orquest() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_inventory_closures_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_ponto_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.user_can_access_centro(uuid, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.refresh_invoices_issued_summary() SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.log_ocr_event(uuid, text, text, text, jsonb) SET search_path = public, pg_temp;
ALTER FUNCTION public.update_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.get_cost_metrics(date, date, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_daily_hours_evolution(date, date, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_metrics_by_service(date, date, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_restaurants_with_franchisees() SET search_path = public, pg_temp;
ALTER FUNCTION public.set_primary_company(uuid, uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.has_role(uuid, app_role) SET search_path = public, pg_temp;
ALTER FUNCTION public.analyze_reconciliation_patterns(text, uuid, integer, numeric) SET search_path = public, pg_temp;
ALTER FUNCTION public.assign_first_admin() SET search_path = public, pg_temp;
ALTER FUNCTION public.has_permission(uuid, permission_action, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.generate_invoice_hash(text, text, date, numeric, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_user_permissions(uuid, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_iva_summary_303(text, date, date) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_centros() SET search_path = public, pg_temp;
ALTER FUNCTION public.get_hours_metrics(date, date, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.update_tax_codes_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.calculate_monthly_depreciations(text, integer, integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_payroll_costs(date, date, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.update_memberships_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.get_journal_book_official(text, date, date) SET search_path = public, pg_temp;
ALTER FUNCTION public.generate_daily_closure_entry(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.detect_dq_issues(date, date, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.trigger_refresh_user_memberships() SET search_path = public, pg_temp;
ALTER FUNCTION public.refresh_user_memberships() SET search_path = public, pg_temp;
ALTER FUNCTION public.get_general_ledger_official(text, date, date, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.generate_closing_entries(text, uuid, date) SET search_path = public, pg_temp;
ALTER FUNCTION public.auto_match_bank_transactions(uuid, integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.audit_trigger() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_accounting_entry_totals() SET search_path = public, pg_temp;
ALTER FUNCTION public.get_opening_balances(text, uuid) SET search_path = public, pg_temp;

-- ✅ RESULTADO: 52 funciones con search_path configurado correctamente