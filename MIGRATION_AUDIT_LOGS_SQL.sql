-- =====================================================
-- PUNTO 5: Sistema de Logs de Auditoría para Migración
-- =====================================================
-- Purpose: Tabla y funciones para tracking detallado de operaciones de migración
-- Created: 2025-01-15
-- Author: Sistema FranquiConta

-- =====================================================
-- 1. TABLA migration_audit_logs
-- =====================================================

CREATE TABLE IF NOT EXISTS public.migration_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Referencias
  migration_run_id UUID REFERENCES public.migration_runs(id) ON DELETE CASCADE,
  fiscal_year_id UUID REFERENCES public.fiscal_years(id) ON DELETE SET NULL,
  centro_code TEXT NOT NULL,
  
  -- Metadatos de la operación
  step_name TEXT NOT NULL, -- 'apertura', 'diario', 'iva_emitidas', 'iva_recibidas', 'bancos', 'cierre'
  action TEXT NOT NULL, -- 'start', 'progress', 'success', 'error', 'warning'
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  
  -- Detalles del evento
  message TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  
  -- Datos de la operación
  records_processed INTEGER DEFAULT 0,
  records_total INTEGER DEFAULT 0,
  execution_time_ms INTEGER DEFAULT 0,
  
  -- Metadatos del usuario
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Indexes
  CONSTRAINT fk_centro FOREIGN KEY (centro_code) REFERENCES public.centres(codigo)
);

-- =====================================================
-- 2. ÍNDICES para optimización de consultas
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_migration_audit_logs_run ON public.migration_audit_logs(migration_run_id);
CREATE INDEX IF NOT EXISTS idx_migration_audit_logs_fiscal_year ON public.migration_audit_logs(fiscal_year_id);
CREATE INDEX IF NOT EXISTS idx_migration_audit_logs_centro ON public.migration_audit_logs(centro_code);
CREATE INDEX IF NOT EXISTS idx_migration_audit_logs_step ON public.migration_audit_logs(step_name);
CREATE INDEX IF NOT EXISTS idx_migration_audit_logs_severity ON public.migration_audit_logs(severity);
CREATE INDEX IF NOT EXISTS idx_migration_audit_logs_created_at ON public.migration_audit_logs(created_at DESC);

-- Index compuesto para filtros comunes
CREATE INDEX IF NOT EXISTS idx_migration_audit_logs_run_step 
  ON public.migration_audit_logs(migration_run_id, step_name, created_at DESC);

-- =====================================================
-- 3. FUNCIÓN: get_migration_logs
-- =====================================================
-- Purpose: Obtiene logs con filtros avanzados y paginación
-- Inputs:
--   p_migration_run_id UUID (opcional)
--   p_fiscal_year_id UUID (opcional)
--   p_step_name TEXT (opcional)
--   p_severity TEXT (opcional)
--   p_limit INTEGER (default 100)
--   p_offset INTEGER (default 0)
-- Output: Tabla con logs filtrados y metadatos
-- =====================================================

CREATE OR REPLACE FUNCTION get_migration_logs(
  p_migration_run_id UUID DEFAULT NULL,
  p_fiscal_year_id UUID DEFAULT NULL,
  p_step_name TEXT DEFAULT NULL,
  p_severity TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  migration_run_id UUID,
  fiscal_year_id UUID,
  centro_code TEXT,
  step_name TEXT,
  action TEXT,
  severity TEXT,
  message TEXT,
  details JSONB,
  records_processed INTEGER,
  records_total INTEGER,
  execution_time_ms INTEGER,
  user_id UUID,
  user_email TEXT,
  created_at TIMESTAMPTZ,
  total_count BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id,
    l.migration_run_id,
    l.fiscal_year_id,
    l.centro_code,
    l.step_name,
    l.action,
    l.severity,
    l.message,
    l.details,
    l.records_processed,
    l.records_total,
    l.execution_time_ms,
    l.user_id,
    l.user_email,
    l.created_at,
    COUNT(*) OVER() AS total_count
  FROM migration_audit_logs l
  WHERE 
    (p_migration_run_id IS NULL OR l.migration_run_id = p_migration_run_id)
    AND (p_fiscal_year_id IS NULL OR l.fiscal_year_id = p_fiscal_year_id)
    AND (p_step_name IS NULL OR l.step_name = p_step_name)
    AND (p_severity IS NULL OR l.severity = p_severity)
  ORDER BY l.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- =====================================================
-- 4. FUNCIÓN: get_migration_logs_summary
-- =====================================================
-- Purpose: Obtiene resumen estadístico de logs por migration_run_id
-- =====================================================

CREATE OR REPLACE FUNCTION get_migration_logs_summary(
  p_migration_run_id UUID
)
RETURNS TABLE (
  total_logs BIGINT,
  total_errors BIGINT,
  total_warnings BIGINT,
  total_records_processed BIGINT,
  avg_execution_time_ms NUMERIC,
  steps_completed TEXT[],
  first_log_at TIMESTAMPTZ,
  last_log_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) AS total_logs,
    COUNT(*) FILTER (WHERE severity = 'error' OR severity = 'critical') AS total_errors,
    COUNT(*) FILTER (WHERE severity = 'warning') AS total_warnings,
    COALESCE(SUM(records_processed), 0) AS total_records_processed,
    ROUND(AVG(execution_time_ms), 2) AS avg_execution_time_ms,
    ARRAY_AGG(DISTINCT step_name ORDER BY step_name) AS steps_completed,
    MIN(created_at) AS first_log_at,
    MAX(created_at) AS last_log_at
  FROM migration_audit_logs
  WHERE migration_run_id = p_migration_run_id;
END;
$$;

-- =====================================================
-- 5. RLS POLICIES
-- =====================================================

ALTER TABLE public.migration_audit_logs ENABLE ROW LEVEL SECURITY;

-- Admins pueden ver todo
CREATE POLICY "Admins can view all migration logs"
  ON public.migration_audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Users pueden ver logs de sus centros
CREATE POLICY "Users can view logs from accessible centres"
  ON public.migration_audit_logs
  FOR SELECT
  USING (
    centro_code IN (
      SELECT centro_code FROM v_user_centres
      WHERE user_id = auth.uid()
    )
  );

-- Sistema puede insertar logs (service role)
CREATE POLICY "Service role can insert logs"
  ON public.migration_audit_logs
  FOR INSERT
  WITH CHECK (true);

-- Logs son append-only (no se pueden modificar)
CREATE POLICY "Logs are append-only"
  ON public.migration_audit_logs
  FOR UPDATE
  USING (false);

-- Logs no se pueden borrar manualmente
CREATE POLICY "Logs cannot be deleted manually"
  ON public.migration_audit_logs
  FOR DELETE
  USING (false);

-- =====================================================
-- 6. COMENTARIOS
-- =====================================================

COMMENT ON TABLE public.migration_audit_logs IS 'Registro detallado de todas las operaciones de migración histórica';
COMMENT ON COLUMN public.migration_audit_logs.step_name IS 'Nombre del paso: apertura, diario, iva_emitidas, iva_recibidas, bancos, cierre';
COMMENT ON COLUMN public.migration_audit_logs.action IS 'Tipo de acción: start, progress, success, error, warning';
COMMENT ON COLUMN public.migration_audit_logs.severity IS 'Nivel de severidad: info, warning, error, critical';
COMMENT ON COLUMN public.migration_audit_logs.details IS 'Datos adicionales en formato JSON (ej: errores, estadísticas, etc)';
COMMENT ON COLUMN public.migration_audit_logs.execution_time_ms IS 'Tiempo de ejecución en milisegundos';

-- =====================================================
-- FIN DE MIGRATION
-- =====================================================
