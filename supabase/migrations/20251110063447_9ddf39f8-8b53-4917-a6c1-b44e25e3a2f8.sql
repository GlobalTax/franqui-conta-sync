-- Simplified P&L Mapping System
-- Purpose: Direct mapping between accounting accounts and P&L lines

-- 1) Create simple P&L line items table
CREATE TABLE IF NOT EXISTS public.pl_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE, -- e.g., "revenue", "cogs", "labor"
  name TEXT NOT NULL, -- e.g., "Ingresos", "Coste Mercancías"
  category TEXT NOT NULL, -- "income" or "expense"
  display_order INTEGER NOT NULL DEFAULT 0,
  parent_code TEXT, -- For hierarchical structure
  is_total BOOLEAN DEFAULT false, -- If true, it's a calculated total line
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2) Create account to P&L line mapping table
CREATE TABLE IF NOT EXISTS public.account_pl_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_code TEXT NOT NULL, -- The PGC account code
  pl_line_code TEXT NOT NULL REFERENCES public.pl_lines(code) ON DELETE CASCADE,
  centro_code TEXT, -- If NULL, applies to all centres
  multiplier NUMERIC DEFAULT 1, -- 1 for normal, -1 to invert sign
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(account_code, pl_line_code, centro_code)
);

-- 3) Insert default P&L structure (McDonald's style)
INSERT INTO public.pl_lines (code, name, category, display_order, parent_code, is_total) VALUES
-- INCOME
('revenue_total', 'INGRESOS TOTALES', 'income', 10, NULL, true),
('revenue_store', 'Ventas en Sala', 'income', 11, 'revenue_total', false),
('revenue_drive', 'Ventas Drive-Thru', 'income', 12, 'revenue_total', false),
('revenue_delivery', 'Ventas Delivery', 'income', 13, 'revenue_total', false),
('revenue_kiosk', 'Ventas Kiosk', 'income', 14, 'revenue_total', false),

-- COGS
('cogs_total', 'COSTE DE MERCANCÍAS', 'expense', 20, NULL, true),
('cogs_food', 'Alimentos', 'expense', 21, 'cogs_total', false),
('cogs_paper', 'Envases y Papel', 'expense', 22, 'cogs_total', false),
('cogs_beverages', 'Bebidas', 'expense', 23, 'cogs_total', false),

-- LABOR
('labor_total', 'COSTES DE PERSONAL', 'expense', 30, NULL, true),
('labor_salaries', 'Salarios', 'expense', 31, 'labor_total', false),
('labor_social', 'Seguridad Social', 'expense', 32, 'labor_total', false),

-- OCCUPANCY
('occupancy_total', 'GASTOS DE OCUPACIÓN', 'expense', 40, NULL, true),
('occupancy_rent', 'Alquiler', 'expense', 41, 'occupancy_total', false),
('occupancy_utilities', 'Suministros (Luz, Agua, Gas)', 'expense', 42, 'occupancy_total', false),

-- OPERATING
('operating_total', 'GASTOS OPERATIVOS', 'expense', 50, NULL, true),
('operating_marketing', 'Marketing Local', 'expense', 51, 'operating_total', false),
('operating_maintenance', 'Mantenimiento', 'expense', 52, 'operating_total', false),
('operating_cleaning', 'Limpieza', 'expense', 53, 'operating_total', false),
('operating_other', 'Otros Gastos Operativos', 'expense', 54, 'operating_total', false),

-- ROYALTIES
('royalty_total', 'ROYALTIES Y FEES', 'expense', 60, NULL, true),
('royalty_franchise', 'Royalty Franquicia', 'expense', 61, 'royalty_total', false),
('royalty_advertising', 'Fondo Publicidad Nacional', 'expense', 62, 'royalty_total', false),

-- DEPRECIATION
('depreciation', 'AMORTIZACIONES', 'expense', 70, NULL, false),

-- FINANCIAL
('financial_total', 'GASTOS FINANCIEROS', 'expense', 80, NULL, true),
('financial_interest', 'Intereses', 'expense', 81, 'financial_total', false),
('financial_banking', 'Comisiones Bancarias', 'expense', 82, 'financial_total', false)
ON CONFLICT (code) DO NOTHING;

-- 4) Insert example mappings (PGC → P&L)
INSERT INTO public.account_pl_mapping (account_code, pl_line_code, multiplier, notes) VALUES
-- Ingresos (PGC 70x → Revenue)
('7000000', 'revenue_store', -1, 'Ventas en sala'),
('7001000', 'revenue_drive', -1, 'Ventas drive-thru'),
('7002000', 'revenue_delivery', -1, 'Ventas delivery'),
('7003000', 'revenue_kiosk', -1, 'Ventas kiosk'),
('7050000', 'revenue_store', -1, 'Ventas genéricas'),

-- COGS (PGC 60x → COGS)
('6000000', 'cogs_food', 1, 'Compras alimentos'),
('6001000', 'cogs_food', 1, 'Compras hamburguesas'),
('6002000', 'cogs_food', 1, 'Compras pollo'),
('6060000', 'cogs_paper', 1, 'Envases y embalajes'),
('6070000', 'cogs_beverages', 1, 'Compras bebidas'),

-- Labor (PGC 64x → Labor)
('6400000', 'labor_salaries', 1, 'Sueldos y salarios'),
('6410000', 'labor_social', 1, 'Seguridad Social'),

-- Occupancy (PGC 621x → Rent, 628x → Utilities)
('6210000', 'occupancy_rent', 1, 'Arrendamientos'),
('6280000', 'occupancy_utilities', 1, 'Suministros'),

-- Operating
('6270000', 'operating_marketing', 1, 'Publicidad y marketing'),
('6220000', 'occupancy_utilities', 1, 'Reparaciones y conservación'),
('6290000', 'operating_other', 1, 'Otros servicios'),

-- Royalties
('6260000', 'royalty_franchise', 1, 'Servicios franquicia (royalty)'),
('6270100', 'royalty_advertising', 1, 'Fondo publicidad nacional'),

-- Depreciation
('6810000', 'depreciation', 1, 'Amortización inmovilizado intangible'),
('6820000', 'depreciation', 1, 'Amortización inmovilizado material'),

-- Financial
('6620000', 'financial_interest', 1, 'Intereses de deudas'),
('6260100', 'financial_banking', 1, 'Servicios bancarios')
ON CONFLICT (account_code, pl_line_code, centro_code) DO NOTHING;

-- 5) Enable RLS
ALTER TABLE public.pl_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_pl_mapping ENABLE ROW LEVEL SECURITY;

-- 6) RLS Policies - Everyone can view, admins can manage
CREATE POLICY "Anyone can view pl_lines"
ON public.pl_lines FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage pl_lines"
ON public.pl_lines FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view account mappings"
ON public.account_pl_mapping FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage account mappings"
ON public.account_pl_mapping FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 7) Create function to get P&L data
CREATE OR REPLACE FUNCTION get_pl_report(
  p_centro_code TEXT,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  line_code TEXT,
  line_name TEXT,
  category TEXT,
  amount NUMERIC,
  is_total BOOLEAN,
  display_order INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH account_balances AS (
    SELECT 
      t.account_code,
      SUM(CASE WHEN t.movement_type = 'debit' THEN t.amount ELSE -t.amount END) as balance
    FROM accounting_transactions t
    JOIN accounting_entries e ON e.id = t.entry_id
    WHERE e.centro_code = p_centro_code
      AND e.entry_date BETWEEN p_start_date AND p_end_date
      AND e.status = 'posted'
    GROUP BY t.account_code
  )
  SELECT 
    pl.code as line_code,
    pl.name as line_name,
    pl.category,
    COALESCE(SUM(ab.balance * m.multiplier), 0) as amount,
    pl.is_total,
    pl.display_order
  FROM pl_lines pl
  LEFT JOIN account_pl_mapping m ON m.pl_line_code = pl.code
    AND (m.centro_code IS NULL OR m.centro_code = p_centro_code)
  LEFT JOIN account_balances ab ON ab.account_code = m.account_code
  WHERE NOT pl.is_total
  GROUP BY pl.code, pl.name, pl.category, pl.is_total, pl.display_order
  ORDER BY pl.display_order;
END;
$$;

COMMENT ON FUNCTION get_pl_report IS 'Returns P&L report data for a centre and date range';
