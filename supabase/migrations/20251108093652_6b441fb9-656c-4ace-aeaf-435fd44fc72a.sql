-- =====================================================
-- FASE 2: Sistema completo de IVA
-- =====================================================

-- 1. Tabla de códigos de impuestos (IVA)
CREATE TABLE IF NOT EXISTS public.tax_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  rate NUMERIC NOT NULL CHECK (rate >= 0 AND rate <= 100),
  type TEXT NOT NULL CHECK (type IN ('soportado', 'repercutido')),
  regime TEXT NOT NULL DEFAULT 'general' CHECK (regime IN ('general', 'recargo_equivalencia', 'isp', 'intracomunitario', 'exento', 'no_sujeto')),
  account_code_base TEXT,
  account_code_fee TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para tax_codes
CREATE INDEX idx_tax_codes_type ON public.tax_codes(type);
CREATE INDEX idx_tax_codes_active ON public.tax_codes(active);

-- 2. Tabla de impuestos aplicados en transacciones
CREATE TABLE IF NOT EXISTS public.accounting_taxes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID REFERENCES public.accounting_transactions(id) ON DELETE CASCADE,
  tax_code_id UUID REFERENCES public.tax_codes(id),
  base_amount NUMERIC NOT NULL,
  tax_rate NUMERIC NOT NULL,
  tax_amount NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_accounting_taxes_transaction ON public.accounting_taxes(transaction_id);
CREATE INDEX idx_accounting_taxes_code ON public.accounting_taxes(tax_code_id);

-- 3. Añadir campos de IVA a invoice_lines
ALTER TABLE public.invoice_lines 
  ADD COLUMN IF NOT EXISTS tax_code_id UUID REFERENCES public.tax_codes(id),
  ADD COLUMN IF NOT EXISTS recargo_equivalencia NUMERIC DEFAULT 0 CHECK (recargo_equivalencia >= 0),
  ADD COLUMN IF NOT EXISTS retencion_percentage NUMERIC DEFAULT 0 CHECK (retencion_percentage >= 0),
  ADD COLUMN IF NOT EXISTS retencion_amount NUMERIC DEFAULT 0;

-- 4. Función para generar Libro de IVA Repercutido (Facturas Expedidas)
CREATE OR REPLACE FUNCTION public.get_libro_iva_repercutido(
  p_centro_code TEXT,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE(
  fecha DATE,
  numero_factura TEXT,
  cliente_nif TEXT,
  cliente_nombre TEXT,
  base_imponible NUMERIC,
  tipo_iva NUMERIC,
  cuota_iva NUMERIC,
  recargo_equivalencia NUMERIC,
  total_factura NUMERIC,
  tipo_operacion TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ii.invoice_date as fecha,
    ii.full_invoice_number as numero_factura,
    ii.customer_tax_id as cliente_nif,
    ii.customer_name as cliente_nombre,
    COALESCE(ii.subtotal, 0) as base_imponible,
    COALESCE(
      (SELECT DISTINCT il.tax_rate FROM invoice_lines il WHERE il.invoice_id = ii.id LIMIT 1),
      0
    ) as tipo_iva,
    COALESCE(ii.tax_total, 0) as cuota_iva,
    COALESCE(
      (SELECT SUM(il.recargo_equivalencia * il.subtotal / 100) 
       FROM invoice_lines il 
       WHERE il.invoice_id = ii.id),
      0
    ) as recargo_equivalencia,
    COALESCE(ii.total, 0) as total_factura,
    CASE 
      WHEN ii.customer_tax_id LIKE 'ES%' THEN 'nacional'
      WHEN ii.customer_tax_id ~ '^[A-Z]{2}' THEN 'intracomunitaria'
      ELSE 'exportacion'
    END as tipo_operacion
  FROM invoices_issued ii
  WHERE ii.centro_code = p_centro_code
    AND ii.invoice_date BETWEEN p_start_date AND p_end_date
    AND ii.status IN ('sent', 'paid')
  ORDER BY ii.invoice_date, ii.full_invoice_number;
END;
$$;

-- 5. Función para generar Libro de IVA Soportado (Facturas Recibidas)
CREATE OR REPLACE FUNCTION public.get_libro_iva_soportado(
  p_centro_code TEXT,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE(
  fecha DATE,
  numero_factura TEXT,
  proveedor_nif TEXT,
  proveedor_nombre TEXT,
  base_imponible NUMERIC,
  tipo_iva NUMERIC,
  cuota_iva NUMERIC,
  cuota_deducible NUMERIC,
  total_factura NUMERIC,
  tipo_operacion TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ir.invoice_date as fecha,
    ir.invoice_number as numero_factura,
    s.tax_id as proveedor_nif,
    s.name as proveedor_nombre,
    COALESCE(ir.subtotal, 0) as base_imponible,
    COALESCE(
      (SELECT DISTINCT il.tax_rate FROM invoice_lines il WHERE il.invoice_id = ir.id LIMIT 1),
      0
    ) as tipo_iva,
    COALESCE(ir.tax_total, 0) as cuota_iva,
    COALESCE(ir.tax_total, 0) as cuota_deducible,
    COALESCE(ir.total, 0) as total_factura,
    CASE 
      WHEN s.tax_id LIKE 'ES%' THEN 'nacional'
      WHEN s.tax_id ~ '^[A-Z]{2}' THEN 'intracomunitaria'
      ELSE 'importacion'
    END as tipo_operacion
  FROM invoices_received ir
  LEFT JOIN suppliers s ON s.id = ir.supplier_id
  WHERE ir.centro_code = p_centro_code
    AND ir.invoice_date BETWEEN p_start_date AND p_end_date
    AND ir.status IN ('approved', 'paid')
  ORDER BY ir.invoice_date, ir.invoice_number;
END;
$$;

-- 6. Función para calcular resumen de IVA (preparación modelo 303)
CREATE OR REPLACE FUNCTION public.get_iva_summary_303(
  p_centro_code TEXT,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE(
  total_base_repercutido NUMERIC,
  total_cuota_repercutido NUMERIC,
  total_base_soportado NUMERIC,
  total_cuota_soportado NUMERIC,
  total_cuota_deducible NUMERIC,
  resultado_liquidacion NUMERIC,
  compensaciones_anteriores NUMERIC,
  resultado_final NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_base_repercutido NUMERIC := 0;
  v_cuota_repercutido NUMERIC := 0;
  v_base_soportado NUMERIC := 0;
  v_cuota_soportado NUMERIC := 0;
BEGIN
  -- IVA Repercutido (ventas)
  SELECT 
    COALESCE(SUM(subtotal), 0),
    COALESCE(SUM(tax_total), 0)
  INTO v_base_repercutido, v_cuota_repercutido
  FROM invoices_issued
  WHERE centro_code = p_centro_code
    AND invoice_date BETWEEN p_start_date AND p_end_date
    AND status IN ('sent', 'paid');

  -- IVA Soportado (compras)
  SELECT 
    COALESCE(SUM(subtotal), 0),
    COALESCE(SUM(tax_total), 0)
  INTO v_base_soportado, v_cuota_soportado
  FROM invoices_received
  WHERE centro_code = p_centro_code
    AND invoice_date BETWEEN p_start_date AND p_end_date
    AND status IN ('approved', 'paid');

  RETURN QUERY
  SELECT
    v_base_repercutido,
    v_cuota_repercutido,
    v_base_soportado,
    v_cuota_soportado,
    v_cuota_soportado as cuota_deducible,
    v_cuota_repercutido - v_cuota_soportado as resultado_liquidacion,
    0::NUMERIC as compensaciones_anteriores,
    v_cuota_repercutido - v_cuota_soportado as resultado_final;
END;
$$;

-- 7. Poblar códigos de IVA estándar en España
INSERT INTO public.tax_codes (code, description, rate, type, regime, account_code_base, account_code_fee) VALUES
-- IVA Soportado (Compras)
('IVA_SOPORTADO_21', 'IVA Soportado 21%', 21, 'soportado', 'general', '472', '472'),
('IVA_SOPORTADO_10', 'IVA Soportado 10%', 10, 'soportado', 'general', '472', '472'),
('IVA_SOPORTADO_4', 'IVA Soportado 4%', 4, 'soportado', 'general', '472', '472'),
('IVA_SOPORTADO_0', 'Operación exenta IVA', 0, 'soportado', 'exento', NULL, NULL),

-- IVA Repercutido (Ventas)
('IVA_REPERCUTIDO_21', 'IVA Repercutido 21%', 21, 'repercutido', 'general', '477', '477'),
('IVA_REPERCUTIDO_10', 'IVA Repercutido 10%', 10, 'repercutido', 'general', '477', '477'),
('IVA_REPERCUTIDO_4', 'IVA Repercutido 4%', 4, 'repercutido', 'general', '477', '477'),
('IVA_REPERCUTIDO_0', 'Operación exenta IVA', 0, 'repercutido', 'exento', NULL, NULL),

-- Recargo de Equivalencia
('RE_52', 'Recargo Equivalencia 5,2%', 5.2, 'repercutido', 'recargo_equivalencia', '477', '477'),
('RE_14', 'Recargo Equivalencia 1,4%', 1.4, 'repercutido', 'recargo_equivalencia', '477', '477'),
('RE_05', 'Recargo Equivalencia 0,5%', 0.5, 'repercutido', 'recargo_equivalencia', '477', '477'),

-- Operaciones especiales
('IVA_INTRA', 'IVA Intracomunitario', 0, 'soportado', 'intracomunitario', NULL, NULL),
('IVA_ISP', 'Inversión Sujeto Pasivo', 0, 'soportado', 'isp', NULL, NULL)
ON CONFLICT (code) DO NOTHING;

-- RLS Policies para tax_codes
ALTER TABLE public.tax_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tax codes"
  ON public.tax_codes FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage tax codes"
  ON public.tax_codes FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies para accounting_taxes
ALTER TABLE public.accounting_taxes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view accounting taxes for accessible entries"
  ON public.accounting_taxes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM accounting_transactions t
      JOIN accounting_entries e ON e.id = t.entry_id
      WHERE t.id = accounting_taxes.transaction_id
        AND e.centro_code IN (
          SELECT centro_code FROM v_user_centres WHERE user_id = auth.uid()
        )
    )
  );

CREATE POLICY "Admins can manage all accounting taxes"
  ON public.accounting_taxes FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger para updated_at en tax_codes
CREATE OR REPLACE FUNCTION public.update_tax_codes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tax_codes_updated_at
  BEFORE UPDATE ON public.tax_codes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_tax_codes_updated_at();

COMMENT ON TABLE public.tax_codes IS 'Códigos de impuestos (IVA, RE, etc.)';
COMMENT ON TABLE public.accounting_taxes IS 'Impuestos aplicados en transacciones contables';
COMMENT ON FUNCTION public.get_libro_iva_repercutido IS 'Genera el libro de IVA repercutido (facturas expedidas)';
COMMENT ON FUNCTION public.get_libro_iva_soportado IS 'Genera el libro de IVA soportado (facturas recibidas)';
COMMENT ON FUNCTION public.get_iva_summary_303 IS 'Calcula resumen de IVA para modelo 303';