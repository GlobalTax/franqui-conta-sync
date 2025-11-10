-- ============================================================================
-- AP MAPPING RULES - Motor de Mapeo Automático de Cuentas Contables (PGC España)
-- ============================================================================

-- Purpose: Tabla de reglas para mapeo automático de facturas de proveedores a cuentas contables
-- según Plan General Contable Español

CREATE TABLE IF NOT EXISTS public.ap_mapping_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificación de la regla
  rule_name TEXT NOT NULL,
  description TEXT,
  
  -- Tipo de matching
  match_type TEXT NOT NULL CHECK (match_type IN (
    'supplier_exact',       -- UUID de proveedor específico
    'supplier_tax_id',      -- NIF/CIF exacto
    'supplier_name_like',   -- Pattern matching en nombre
    'text_keywords',        -- Keywords en descripción de líneas
    'amount_range',         -- Rango de montos
    'centre_code',          -- Centro específico
    'combined'              -- Combinación de múltiples criterios (AND)
  )),
  
  -- Criterios de matching (según match_type)
  supplier_id UUID,
  supplier_tax_id TEXT,
  supplier_name_pattern TEXT, -- Soporta % como wildcard (ej: 'MAKRO%')
  text_keywords TEXT[], -- Array de palabras clave
  amount_min NUMERIC(12,2),
  amount_max NUMERIC(12,2),
  centro_code TEXT,
  
  -- Cuentas sugeridas (PGC)
  suggested_expense_account TEXT NOT NULL, -- Cuenta de gasto (6xx)
  suggested_tax_account TEXT DEFAULT '4720000' NOT NULL, -- IVA soportado
  suggested_ap_account TEXT DEFAULT '4100000' NOT NULL, -- Proveedores
  suggested_centre_id UUID,
  
  -- Confianza y rationale
  confidence_score INTEGER DEFAULT 80 CHECK (confidence_score >= 0 AND confidence_score <= 100),
  rationale TEXT NOT NULL,
  
  -- Prioridad (mayor número = mayor prioridad)
  priority INTEGER DEFAULT 50,
  
  -- Control
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID
);

-- Índices para rendimiento
CREATE INDEX idx_ap_mapping_rules_match_type ON public.ap_mapping_rules(match_type);
CREATE INDEX idx_ap_mapping_rules_priority ON public.ap_mapping_rules(priority DESC);
CREATE INDEX idx_ap_mapping_rules_active ON public.ap_mapping_rules(active);
CREATE INDEX idx_ap_mapping_rules_supplier_id ON public.ap_mapping_rules(supplier_id);

-- RLS Policies
ALTER TABLE public.ap_mapping_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "AP rules visible to authenticated users"
  ON public.ap_mapping_rules FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin can manage AP rules"
  ON public.ap_mapping_rules FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Trigger para updated_at
CREATE TRIGGER update_ap_mapping_rules_updated_at
  BEFORE UPDATE ON public.ap_mapping_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_servicios_orquest();

-- ============================================================================
-- DATOS DE EJEMPLO - 6 Reglas de Mapeo Representativas
-- ============================================================================

-- REGLA 1: MAKRO - Proveedor mayorista de alimentación
INSERT INTO public.ap_mapping_rules (
  rule_name,
  description,
  match_type,
  supplier_name_pattern,
  suggested_expense_account,
  suggested_tax_account,
  suggested_ap_account,
  confidence_score,
  rationale,
  priority
) VALUES (
  'MAKRO - Alimentación',
  'Compras de alimentos y bebidas en MAKRO',
  'supplier_name_like',
  '%MAKRO%',
  '6000000',
  '4720000',
  '4100000',
  95,
  'Proveedor mayorista MAKRO identificado por nombre',
  100
);

-- REGLA 2: EUROPASTRY - Bollería y panadería
INSERT INTO public.ap_mapping_rules (
  rule_name,
  description,
  match_type,
  supplier_name_pattern,
  suggested_expense_account,
  suggested_tax_account,
  suggested_ap_account,
  confidence_score,
  rationale,
  priority
) VALUES (
  'EUROPASTRY - Bollería',
  'Proveedor de productos de panadería congelados',
  'supplier_name_like',
  '%EUROPASTRY%',
  '6000001',
  '4720000',
  '4100000',
  95,
  'Proveedor EUROPASTRY - panadería congelada',
  100
);

-- REGLA 3: Papel y packaging - Keywords
INSERT INTO public.ap_mapping_rules (
  rule_name,
  description,
  match_type,
  text_keywords,
  suggested_expense_account,
  suggested_tax_account,
  suggested_ap_account,
  confidence_score,
  rationale,
  priority
) VALUES (
  'Papel y Packaging',
  'Detecta compras de material de embalaje por palabras clave',
  'text_keywords',
  ARRAY['papel', 'packaging', 'embalaje', 'bolsa', 'caja', 'envase'],
  '6060000',
  '4720000',
  '4100000',
  80,
  'Material de packaging detectado por keywords',
  80
);

-- REGLA 4: Utilities ENDESA - Electricidad
INSERT INTO public.ap_mapping_rules (
  rule_name,
  description,
  match_type,
  supplier_name_pattern,
  suggested_expense_account,
  suggested_tax_account,
  suggested_ap_account,
  confidence_score,
  rationale,
  priority
) VALUES (
  'ENDESA - Electricidad',
  'Facturas de energía eléctrica',
  'supplier_name_like',
  '%ENDESA%',
  '6281000',
  '4720000',
  '4100000',
  90,
  'Proveedor de electricidad ENDESA',
  90
);

-- REGLA 5: Utilities Agua - Keywords
INSERT INTO public.ap_mapping_rules (
  rule_name,
  description,
  match_type,
  text_keywords,
  suggested_expense_account,
  suggested_tax_account,
  suggested_ap_account,
  confidence_score,
  rationale,
  priority
) VALUES (
  'Agua - Suministros',
  'Facturas de agua por keywords',
  'text_keywords',
  ARRAY['agua', 'canal', 'aqualia', 'agbar'],
  '6282000',
  '4720000',
  '4100000',
  85,
  'Suministro de agua detectado',
  85
);

-- REGLA 6: Gastos menores genéricos - Amount range
INSERT INTO public.ap_mapping_rules (
  rule_name,
  description,
  match_type,
  amount_min,
  amount_max,
  suggested_expense_account,
  suggested_tax_account,
  suggested_ap_account,
  confidence_score,
  rationale,
  priority
) VALUES (
  'Gastos Menores',
  'Facturas pequeñas genéricas (< 50€)',
  'amount_range',
  0,
  50,
  '6290000',
  '4720000',
  '4100000',
  60,
  'Gasto menor genérico por monto',
  50
);

-- Comentarios
COMMENT ON TABLE public.ap_mapping_rules IS 'Reglas de mapeo automático de facturas de proveedores a cuentas contables según PGC España';
COMMENT ON COLUMN public.ap_mapping_rules.match_type IS 'Tipo de criterio: supplier_exact, supplier_tax_id, supplier_name_like, text_keywords, amount_range, centre_code, combined';
COMMENT ON COLUMN public.ap_mapping_rules.priority IS 'Mayor número = mayor prioridad. Se aplica la primera regla que hace match';
COMMENT ON COLUMN public.ap_mapping_rules.confidence_score IS 'Nivel de confianza 0-100. >= 80 se considera alta confianza';