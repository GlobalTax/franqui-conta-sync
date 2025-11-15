-- ============================================================================
-- PROVISIONES - Sistema de provisiones de gastos para cierre mensual P&L
-- ============================================================================

-- Tabla de plantillas de provisiones (para provisiones repetitivas)
CREATE TABLE IF NOT EXISTS public.provision_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centro_code TEXT NOT NULL REFERENCES public.centres(codigo) ON DELETE CASCADE,
  template_name TEXT NOT NULL,
  description TEXT,
  expense_account TEXT NOT NULL,
  provision_account TEXT NOT NULL DEFAULT '4009000000', -- Proveedores operaciones pendientes
  default_amount DECIMAL(15,2),
  supplier_name TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla de provisiones
CREATE TABLE IF NOT EXISTS public.provisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centro_code TEXT NOT NULL REFERENCES public.centres(codigo) ON DELETE CASCADE,
  provision_number TEXT NOT NULL,
  provision_date DATE NOT NULL,
  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL,
  
  -- Cuentas contables
  expense_account TEXT NOT NULL,
  provision_account TEXT NOT NULL DEFAULT '4009000000',
  
  -- Datos de la provisión
  supplier_name TEXT NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
  
  -- Estado
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'invoiced', 'cancelled')),
  
  -- Asientos contables
  accounting_entry_id UUID REFERENCES public.accounting_entries(id) ON DELETE SET NULL,
  reversal_entry_id UUID REFERENCES public.accounting_entries(id) ON DELETE SET NULL,
  
  -- Relación con factura real (si se cancela contra factura)
  invoice_id UUID REFERENCES public.invoices_received(id) ON DELETE SET NULL,
  
  -- Template origen (si viene de plantilla)
  template_id UUID REFERENCES public.provision_templates(id) ON DELETE SET NULL,
  
  -- Metadata
  notes TEXT,
  cancelled_reason TEXT,
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES auth.users(id),
  
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(centro_code, provision_number)
);

-- Índices para mejor rendimiento
CREATE INDEX idx_provisions_centro_period ON public.provisions(centro_code, period_year, period_month);
CREATE INDEX idx_provisions_status ON public.provisions(status);
CREATE INDEX idx_provisions_date ON public.provisions(provision_date);
CREATE INDEX idx_provisions_template ON public.provisions(template_id);
CREATE INDEX idx_provision_templates_centro ON public.provision_templates(centro_code);

-- RLS para provision_templates
ALTER TABLE public.provision_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view templates from their centres"
  ON public.provision_templates FOR SELECT
  USING (
    centro_code IN (
      SELECT restaurant_code FROM v_user_memberships WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert templates in their centres"
  ON public.provision_templates FOR INSERT
  WITH CHECK (
    centro_code IN (
      SELECT restaurant_code FROM v_user_memberships WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update templates in their centres"
  ON public.provision_templates FOR UPDATE
  USING (
    centro_code IN (
      SELECT restaurant_code FROM v_user_memberships WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete templates in their centres"
  ON public.provision_templates FOR DELETE
  USING (
    centro_code IN (
      SELECT restaurant_code FROM v_user_memberships WHERE user_id = auth.uid()
    )
  );

-- RLS para provisions
ALTER TABLE public.provisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view provisions from their centres"
  ON public.provisions FOR SELECT
  USING (
    centro_code IN (
      SELECT restaurant_code FROM v_user_memberships WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert provisions in their centres"
  ON public.provisions FOR INSERT
  WITH CHECK (
    centro_code IN (
      SELECT restaurant_code FROM v_user_memberships WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update provisions in their centres"
  ON public.provisions FOR UPDATE
  USING (
    centro_code IN (
      SELECT restaurant_code FROM v_user_memberships WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete provisions in their centres"
  ON public.provisions FOR DELETE
  USING (
    centro_code IN (
      SELECT restaurant_code FROM v_user_memberships WHERE user_id = auth.uid()
    )
  );

-- Trigger para updated_at
CREATE TRIGGER update_provisions_updated_at
  BEFORE UPDATE ON public.provisions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_provision_templates_updated_at
  BEFORE UPDATE ON public.provision_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Comentarios
COMMENT ON TABLE public.provision_templates IS 'Plantillas de provisiones repetitivas para facilitar el registro mensual';
COMMENT ON TABLE public.provisions IS 'Provisiones de gastos para cierre mensual de P&L cuando faltan facturas';
COMMENT ON COLUMN public.provisions.status IS 'draft=borrador, active=contabilizada, invoiced=cancelada contra factura, cancelled=cancelada sin factura';
COMMENT ON COLUMN public.provisions.provision_account IS 'Cuenta 4009 - Proveedores por operaciones pendientes de formalizar';
COMMENT ON COLUMN public.provisions.accounting_entry_id IS 'Asiento contable de la provisión (DEBE gasto / HABER provisión)';
COMMENT ON COLUMN public.provisions.reversal_entry_id IS 'Asiento de reversión cuando se cancela la provisión';