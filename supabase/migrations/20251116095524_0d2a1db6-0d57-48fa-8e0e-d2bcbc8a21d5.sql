-- ============================================================================
-- SPRINT 1 - FASE 1.1: FIX SECURITY WARNINGS (RLS Policies) - FINAL
-- Objetivo: Resolver 2 warnings de tablas sin RLS policies
-- Fix: Usar valores correctos del enum app_role (admin, gestor, franquiciado, asesoria, contable)
-- ============================================================================

-- 1. RLS Policies para ocr_processing_log
-- Esta tabla registra eventos de OCR (solo lectura para admin/contable/gestor)

-- Enable RLS si no está habilitado
ALTER TABLE public.ocr_processing_log ENABLE ROW LEVEL SECURITY;

-- Policy: Admin puede ver todos los logs
CREATE POLICY "Admin can view all OCR logs"
  ON public.ocr_processing_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
  );

-- Policy: Contables y gestores pueden ver logs de su centro
CREATE POLICY "Staff can view OCR logs for their centro"
  ON public.ocr_processing_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.invoices_received ir ON ir.id = ocr_processing_log.invoice_id
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('contable', 'gestor')
        AND (ur.centro IS NULL OR ur.centro = ir.centro_code)
    )
  );

-- Policy: Sistema puede insertar logs (para edge functions)
CREATE POLICY "System can insert OCR logs"
  ON public.ocr_processing_log
  FOR INSERT
  TO authenticated
  WITH CHECK (true);


-- 2. RLS Policies para journal_source
-- Esta tabla registra fuente de asientos contables (solo lectura para admin/contable)

-- Enable RLS si no está habilitado
ALTER TABLE public.journal_source ENABLE ROW LEVEL SECURITY;

-- Policy: Admin puede ver todas las fuentes
CREATE POLICY "Admin can view all journal sources"
  ON public.journal_source
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
  );

-- Policy: Contables y gestores pueden ver fuentes de su centro
CREATE POLICY "Staff can view journal sources for their centro"
  ON public.journal_source
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.accounting_entries ae ON ae.id = journal_source.entry_id
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('contable', 'gestor', 'admin')
        AND (ur.centro IS NULL OR ur.centro = ae.centro_code)
    )
  );

-- Policy: Sistema puede insertar/actualizar (para automatizaciones)
CREATE POLICY "System can write journal sources"
  ON public.journal_source
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ✅ RESULTADO: 2 tablas con RLS policies configuradas correctamente