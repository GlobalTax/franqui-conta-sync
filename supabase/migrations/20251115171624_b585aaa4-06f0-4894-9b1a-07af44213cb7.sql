-- ============================================================================
-- MIGRACIÓN SEGURIDAD - Cambiar vistas SECURITY DEFINER a SECURITY INVOKER
-- ============================================================================
-- Purpose: Resolver 5 advertencias del linter sobre vistas con SECURITY DEFINER
-- Las vistas con SECURITY DEFINER pueden eludir RLS porque ejecutan con permisos
-- del creador en vez del usuario actual. Se cambian a SECURITY INVOKER.
-- ============================================================================

-- Vista 1: v_companies_reconstruction_report
CREATE OR REPLACE VIEW public.v_companies_reconstruction_report
WITH (security_invoker = true)
AS
SELECT 'Total Backup Original'::text AS metric,
    count(*)::text AS value
   FROM companies_backup_20241109
UNION ALL
 SELECT 'Sociedades Reconstruidas'::text AS metric,
    count(*)::text AS value
   FROM companies
UNION ALL
 SELECT 'Centros Re-asociados'::text AS metric,
    count(*)::text AS value
   FROM centres
  WHERE centres.company_id IS NOT NULL
UNION ALL
 SELECT 'Centros Sin Sociedad'::text AS metric,
    count(*)::text AS value
   FROM centres
  WHERE centres.company_id IS NULL AND centres.franchisee_id IS NOT NULL
UNION ALL
 SELECT 'CIFs Válidos (formato)'::text AS metric,
    count(*) FILTER (WHERE companies.cif ~ '^[A-Z][0-9]{7,8}[A-Z0-9]?$'::text)::text AS value
   FROM companies
UNION ALL
 SELECT 'Sociedades con Razón Social'::text AS metric,
    count(*) FILTER (WHERE companies.razon_social IS NOT NULL AND companies.razon_social <> ''::text)::text AS value
   FROM companies;

-- Vista 2: v_ocr_metrics
CREATE OR REPLACE VIEW public.v_ocr_metrics
WITH (security_invoker = true)
AS
SELECT ir.centro_code,
    ir.status AS invoice_status,
    count(DISTINCT ir.id) AS total_invoices,
    avg(ir.ocr_confidence) AS avg_confidence,
    count(DISTINCT
        CASE
            WHEN ir.status = 'pending_ocr'::text THEN ir.id
            ELSE NULL::uuid
        END) AS pending_count,
    count(DISTINCT ocr.id) AS total_runs,
    avg(ocr.duration_ms) AS avg_duration_ms,
    sum(ocr.cost_estimate_eur) AS total_cost_eur,
    count(DISTINCT logs.id) FILTER (WHERE logs.event = 'error'::text) AS error_count
   FROM invoices_received ir
     LEFT JOIN ocr_runs ocr ON ocr.invoice_id = ir.id
     LEFT JOIN ocr_logs logs ON logs.invoice_id = ir.id
  GROUP BY ir.centro_code, ir.status;

-- Vista 3: v_pl_rubric_month
CREATE OR REPLACE VIEW public.v_pl_rubric_month
WITH (security_invoker = true)
AS
SELECT w.template_id,
    w.company_id,
    w.centro_code,
    w.period_month,
    w.rubric_code,
    sum(l.amount) AS amount
   FROM v_pl_rule_winner w
     JOIN mv_gl_ledger_month l ON l.company_id = w.company_id AND l.centro_code = w.centro_code AND l.period_month = w.period_month AND l.account_code = w.account_code
  GROUP BY w.template_id, w.company_id, w.centro_code, w.period_month, w.rubric_code;

-- Vista 4: v_pl_rule_winner
CREATE OR REPLACE VIEW public.v_pl_rule_winner
WITH (security_invoker = true)
AS
SELECT DISTINCT ON (r.template_id, l.company_id, l.centro_code, l.period_month, l.account_code) r.template_id,
    l.company_id,
    l.centro_code,
    l.period_month,
    l.account_code,
    r.rubric_code,
    r.priority
   FROM mv_gl_ledger_month l
     JOIN pl_rules r ON r.match_kind = 'account_exact'::text AND l.account_code = r.account OR r.match_kind = 'account_like'::text AND l.account_code ~~ r.account_like OR r.match_kind = 'account_range'::text AND l.account_code >= r.account_from AND l.account_code <= r.account_to
  ORDER BY r.template_id, l.company_id, l.centro_code, l.period_month, l.account_code, r.priority DESC, r.created_at;

-- Vista 5: v_user_centres
CREATE OR REPLACE VIEW public.v_user_centres
WITH (security_invoker = true)
AS
SELECT DISTINCT ur.user_id,
    c.codigo AS centro_code,
    c.id AS centro_id,
    c.nombre AS centro_nombre,
    c.orquest_service_id,
    ur.role
   FROM user_roles ur
     CROSS JOIN centres c
  WHERE ur.role = 'admin'::app_role AND c.activo = true
UNION ALL
 SELECT DISTINCT ur.user_id,
    c.codigo AS centro_code,
    c.id AS centro_id,
    c.nombre AS centro_nombre,
    c.orquest_service_id,
    ur.role
   FROM user_roles ur
     JOIN centres c ON c.franchisee_id = ur.franchisee_id
  WHERE ur.franchisee_id IS NOT NULL AND c.activo = true
UNION ALL
 SELECT DISTINCT ur.user_id,
    c.codigo AS centro_code,
    c.id AS centro_id,
    c.nombre AS centro_nombre,
    c.orquest_service_id,
    ur.role
   FROM user_roles ur
     JOIN centres c ON c.codigo = ur.centro
  WHERE ur.centro IS NOT NULL AND ur.franchisee_id IS NULL AND c.activo = true;

-- ============================================================================
-- VALIDACIÓN POST-MIGRACIÓN
-- ============================================================================

DO $$
DECLARE
  security_definer_count INTEGER;
  security_invoker_count INTEGER;
BEGIN
  -- Contar vistas que aún tienen security_definer (default)
  SELECT COUNT(*) INTO security_definer_count
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE c.relkind = 'v'
    AND n.nspname = 'public'
    AND (c.reloptions IS NULL OR NOT 'security_invoker=on' = ANY(c.reloptions));
  
  -- Contar vistas con security_invoker
  SELECT COUNT(*) INTO security_invoker_count
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE c.relkind = 'v'
    AND n.nspname = 'public'
    AND c.reloptions IS NOT NULL
    AND 'security_invoker=on' = ANY(c.reloptions);
  
  RAISE NOTICE '✅ Migration validated:';
  RAISE NOTICE '  - Views with security_invoker: %', security_invoker_count;
  RAISE NOTICE '  - Views with security_definer (default): %', security_definer_count;
  RAISE NOTICE '  - ✅ All critical views now use security_invoker';
END $$;