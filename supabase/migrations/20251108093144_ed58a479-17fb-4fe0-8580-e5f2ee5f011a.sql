-- =====================================================
-- FASE 1: Plan de Cuentas PGC y Control de Asientos
-- =====================================================

-- 1. Tabla de plantillas del Plan General Contable (PGC/PGC-PYMES)
CREATE TABLE IF NOT EXISTS public.account_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('asset', 'liability', 'equity', 'income', 'expense')),
  level INTEGER NOT NULL CHECK (level BETWEEN 1 AND 9),
  pgc_version TEXT NOT NULL DEFAULT 'PGC-PYMES',
  parent_code TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(code, pgc_version)
);

CREATE INDEX idx_account_templates_code ON public.account_templates(code);
CREATE INDEX idx_account_templates_type ON public.account_templates(account_type);
CREATE INDEX idx_account_templates_level ON public.account_templates(level);

-- 2. Tabla de series contables para numeración de asientos
CREATE TABLE IF NOT EXISTS public.series_contables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  centro_code TEXT NOT NULL,
  ejercicio INTEGER NOT NULL,
  serie TEXT NOT NULL DEFAULT 'GENERAL',
  descripcion TEXT,
  next_number INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, centro_code, ejercicio, serie)
);

CREATE INDEX idx_series_contables_company ON public.series_contables(company_id);
CREATE INDEX idx_series_contables_centro ON public.series_contables(centro_code);

-- 3. Añadir campos de control a accounting_entries
ALTER TABLE public.accounting_entries 
  ADD COLUMN IF NOT EXISTS serie TEXT DEFAULT 'GENERAL',
  ADD COLUMN IF NOT EXISTS posted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS posted_by UUID REFERENCES auth.users(id);

-- 4. Función para calcular Sumas y Saldos (Trial Balance)
CREATE OR REPLACE FUNCTION public.calculate_trial_balance(
  p_centro_code TEXT,
  p_company_id UUID DEFAULT NULL,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE(
  account_code TEXT,
  account_name TEXT,
  account_type TEXT,
  level INTEGER,
  parent_code TEXT,
  debit_total NUMERIC,
  credit_total NUMERIC,
  balance NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH account_movements AS (
    SELECT 
      t.account_code,
      a.name as account_name,
      a.account_type,
      a.level,
      a.parent_code,
      SUM(CASE WHEN t.movement_type = 'debit' THEN t.amount ELSE 0 END) as debit_total,
      SUM(CASE WHEN t.movement_type = 'credit' THEN t.amount ELSE 0 END) as credit_total
    FROM accounting_transactions t
    JOIN accounting_entries e ON e.id = t.entry_id
    JOIN accounts a ON a.code = t.account_code
    WHERE e.centro_code = p_centro_code
      AND e.status IN ('posted', 'closed')
      AND (p_start_date IS NULL OR e.entry_date >= p_start_date)
      AND (p_end_date IS NULL OR e.entry_date <= p_end_date)
    GROUP BY t.account_code, a.name, a.account_type, a.level, a.parent_code
  )
  SELECT 
    am.account_code,
    am.account_name,
    am.account_type,
    am.level,
    am.parent_code,
    COALESCE(am.debit_total, 0) as debit_total,
    COALESCE(am.credit_total, 0) as credit_total,
    COALESCE(am.debit_total, 0) - COALESCE(am.credit_total, 0) as balance
  FROM account_movements am
  ORDER BY am.account_code;
END;
$$;

-- 5. Poblar plantilla PGC-PYMES básica (estructura principal)
INSERT INTO public.account_templates (code, name, account_type, level, pgc_version, description) VALUES
-- GRUPO 1: FINANCIACIÓN BÁSICA
('1', 'FINANCIACIÓN BÁSICA', 'equity', 1, 'PGC-PYMES', 'Patrimonio neto y pasivos no corrientes'),
('10', 'CAPITAL', 'equity', 2, 'PGC-PYMES', 'Capital social'),
('100', 'Capital social', 'equity', 3, 'PGC-PYMES', 'Capital suscrito'),
('11', 'RESERVAS', 'equity', 2, 'PGC-PYMES', 'Reservas'),
('112', 'Reserva legal', 'equity', 3, 'PGC-PYMES', 'Reserva legal obligatoria'),
('113', 'Reservas voluntarias', 'equity', 3, 'PGC-PYMES', 'Reservas voluntarias'),
('12', 'RESULTADOS PENDIENTES DE APLICACIÓN', 'equity', 2, 'PGC-PYMES', 'Resultados no aplicados'),
('120', 'Remanente', 'equity', 3, 'PGC-PYMES', 'Beneficios no aplicados'),
('121', 'Resultados negativos de ejercicios anteriores', 'equity', 3, 'PGC-PYMES', 'Pérdidas pendientes'),
('129', 'Resultado del ejercicio', 'equity', 3, 'PGC-PYMES', 'Beneficio o pérdida del ejercicio'),
('17', 'DEUDAS A LARGO PLAZO POR PRÉSTAMOS RECIBIDOS Y OTROS CONCEPTOS', 'liability', 2, 'PGC-PYMES', 'Deudas L/P'),
('170', 'Deudas a largo plazo con entidades de crédito', 'liability', 3, 'PGC-PYMES', 'Préstamos bancarios L/P'),

-- GRUPO 2: ACTIVO NO CORRIENTE
('2', 'ACTIVO NO CORRIENTE', 'asset', 1, 'PGC-PYMES', 'Inmovilizado'),
('20', 'INMOVILIZACIONES INTANGIBLES', 'asset', 2, 'PGC-PYMES', 'Intangibles'),
('206', 'Aplicaciones informáticas', 'asset', 3, 'PGC-PYMES', 'Software'),
('21', 'INMOVILIZACIONES MATERIALES', 'asset', 2, 'PGC-PYMES', 'Inmovilizado material'),
('210', 'Terrenos y bienes naturales', 'asset', 3, 'PGC-PYMES', 'Terrenos'),
('211', 'Construcciones', 'asset', 3, 'PGC-PYMES', 'Edificios'),
('216', 'Mobiliario', 'asset', 3, 'PGC-PYMES', 'Muebles y enseres'),
('217', 'Equipos para procesos de información', 'asset', 3, 'PGC-PYMES', 'Equipos informáticos'),
('218', 'Elementos de transporte', 'asset', 3, 'PGC-PYMES', 'Vehículos'),
('28', 'AMORTIZACIÓN ACUMULADA DEL INMOVILIZADO', 'asset', 2, 'PGC-PYMES', 'Amortizaciones'),
('280', 'Amortización acumulada del inmovilizado intangible', 'asset', 3, 'PGC-PYMES', 'Amortización intangibles'),
('281', 'Amortización acumulada del inmovilizado material', 'asset', 3, 'PGC-PYMES', 'Amortización material'),

-- GRUPO 4: ACREEDORES Y DEUDORES POR OPERACIONES COMERCIALES
('4', 'ACREEDORES Y DEUDORES', 'asset', 1, 'PGC-PYMES', 'Deudores y acreedores comerciales'),
('40', 'PROVEEDORES', 'liability', 2, 'PGC-PYMES', 'Proveedores'),
('400', 'Proveedores', 'liability', 3, 'PGC-PYMES', 'Proveedores nacionales'),
('41', 'ACREEDORES VARIOS', 'liability', 2, 'PGC-PYMES', 'Acreedores varios'),
('410', 'Acreedores por prestaciones de servicios', 'liability', 3, 'PGC-PYMES', 'Acreedores servicios'),
('43', 'CLIENTES', 'asset', 2, 'PGC-PYMES', 'Clientes'),
('430', 'Clientes', 'asset', 3, 'PGC-PYMES', 'Clientes nacionales'),
('44', 'DEUDORES VARIOS', 'asset', 2, 'PGC-PYMES', 'Deudores varios'),
('440', 'Deudores', 'asset', 3, 'PGC-PYMES', 'Deudores por ventas'),
('47', 'ADMINISTRACIONES PÚBLICAS', 'asset', 2, 'PGC-PYMES', 'Hacienda Pública'),
('472', 'Hacienda Pública, IVA soportado', 'asset', 3, 'PGC-PYMES', 'IVA soportado deducible'),
('477', 'Hacienda Pública, IVA repercutido', 'liability', 3, 'PGC-PYMES', 'IVA repercutido a ingresar'),
('4750', 'Hacienda Pública, acreedora por retenciones', 'liability', 4, 'PGC-PYMES', 'Retenciones a ingresar'),
('4751', 'Hacienda Pública, acreedora por IVA', 'liability', 4, 'PGC-PYMES', 'IVA a ingresar'),

-- GRUPO 5: CUENTAS FINANCIERAS
('5', 'CUENTAS FINANCIERAS', 'asset', 1, 'PGC-PYMES', 'Cuentas financieras'),
('52', 'DEUDAS A CORTO PLAZO POR PRÉSTAMOS RECIBIDOS Y OTROS CONCEPTOS', 'liability', 2, 'PGC-PYMES', 'Deudas C/P'),
('520', 'Deudas a corto plazo con entidades de crédito', 'liability', 3, 'PGC-PYMES', 'Préstamos bancarios C/P'),
('57', 'TESORERÍA', 'asset', 2, 'PGC-PYMES', 'Tesorería'),
('570', 'Caja, euros', 'asset', 3, 'PGC-PYMES', 'Efectivo en caja'),
('572', 'Bancos e instituciones de crédito c/c vista, euros', 'asset', 3, 'PGC-PYMES', 'Cuentas corrientes bancarias'),

-- GRUPO 6: COMPRAS Y GASTOS
('6', 'COMPRAS Y GASTOS', 'expense', 1, 'PGC-PYMES', 'Gastos del ejercicio'),
('60', 'COMPRAS', 'expense', 2, 'PGC-PYMES', 'Compras de mercaderías y materias primas'),
('600', 'Compras de mercaderías', 'expense', 3, 'PGC-PYMES', 'Compras mercaderías'),
('62', 'SERVICIOS EXTERIORES', 'expense', 2, 'PGC-PYMES', 'Servicios contratados'),
('621', 'Arrendamientos y cánones', 'expense', 3, 'PGC-PYMES', 'Alquileres'),
('622', 'Reparaciones y conservación', 'expense', 3, 'PGC-PYMES', 'Mantenimiento'),
('623', 'Servicios de profesionales independientes', 'expense', 3, 'PGC-PYMES', 'Honorarios profesionales'),
('624', 'Transportes', 'expense', 3, 'PGC-PYMES', 'Gastos de transporte'),
('625', 'Primas de seguros', 'expense', 3, 'PGC-PYMES', 'Seguros'),
('626', 'Servicios bancarios y similares', 'expense', 3, 'PGC-PYMES', 'Comisiones bancarias'),
('627', 'Publicidad, propaganda y relaciones públicas', 'expense', 3, 'PGC-PYMES', 'Marketing y publicidad'),
('628', 'Suministros', 'expense', 3, 'PGC-PYMES', 'Agua, luz, gas, etc.'),
('629', 'Otros servicios', 'expense', 3, 'PGC-PYMES', 'Servicios diversos'),
('64', 'GASTOS DE PERSONAL', 'expense', 2, 'PGC-PYMES', 'Gastos de personal'),
('640', 'Sueldos y salarios', 'expense', 3, 'PGC-PYMES', 'Sueldos brutos'),
('642', 'Seguridad Social a cargo de la empresa', 'expense', 3, 'PGC-PYMES', 'Cotizaciones SS'),
('68', 'DOTACIONES PARA AMORTIZACIONES', 'expense', 2, 'PGC-PYMES', 'Amortizaciones del ejercicio'),
('680', 'Amortización del inmovilizado intangible', 'expense', 3, 'PGC-PYMES', 'Amortización intangibles'),
('681', 'Amortización del inmovilizado material', 'expense', 3, 'PGC-PYMES', 'Amortización material'),

-- GRUPO 7: VENTAS E INGRESOS
('7', 'VENTAS E INGRESOS', 'income', 1, 'PGC-PYMES', 'Ingresos del ejercicio'),
('70', 'VENTAS DE MERCADERÍAS, DE PRODUCCIÓN PROPIA, DE SERVICIOS, ETC.', 'income', 2, 'PGC-PYMES', 'Ventas'),
('700', 'Ventas de mercaderías', 'income', 3, 'PGC-PYMES', 'Ingresos por ventas'),
('705', 'Prestaciones de servicios', 'income', 3, 'PGC-PYMES', 'Ingresos por servicios'),
('75', 'OTROS INGRESOS DE GESTIÓN', 'income', 2, 'PGC-PYMES', 'Ingresos diversos'),
('752', 'Ingresos por arrendamientos', 'income', 3, 'PGC-PYMES', 'Alquileres cobrados'),
('76', 'INGRESOS FINANCIEROS', 'income', 2, 'PGC-PYMES', 'Ingresos financieros'),
('769', 'Otros ingresos financieros', 'income', 3, 'PGC-PYMES', 'Intereses y rendimientos')
ON CONFLICT (code, pgc_version) DO NOTHING;

-- RLS Policies para account_templates
ALTER TABLE public.account_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view account templates"
  ON public.account_templates FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage account templates"
  ON public.account_templates FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies para series_contables
ALTER TABLE public.series_contables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all series"
  ON public.series_contables FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view series for accessible centres"
  ON public.series_contables FOR SELECT
  USING (
    centro_code IN (
      SELECT centro_code FROM v_user_centres WHERE user_id = auth.uid()
    )
  );

-- Trigger para actualizar updated_at en series_contables
CREATE OR REPLACE FUNCTION public.update_series_contables_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_series_contables_updated_at
  BEFORE UPDATE ON public.series_contables
  FOR EACH ROW
  EXECUTE FUNCTION public.update_series_contables_updated_at();

COMMENT ON TABLE public.account_templates IS 'Plantillas del Plan General Contable (PGC/PGC-PYMES)';
COMMENT ON TABLE public.series_contables IS 'Series de numeración para asientos contables por ejercicio';
COMMENT ON FUNCTION public.calculate_trial_balance IS 'Calcula el balance de sumas y saldos para un centro y periodo';