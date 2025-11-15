-- ============================================================================
-- MIGRATION: Sistema de asientos de existencias mensuales
-- ============================================================================
-- Permite registrar la variación de existencias mensual de forma global
-- o desglosada por subpartidas (food, paper, bebidas, etc.)
-- ============================================================================

-- Tabla principal de cierres de existencias
CREATE TABLE IF NOT EXISTS public.inventory_closures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  centro_code TEXT NOT NULL,
  
  -- Periodo
  closure_month INTEGER NOT NULL CHECK (closure_month >= 1 AND closure_month <= 12),
  closure_year INTEGER NOT NULL CHECK (closure_year >= 2000),
  
  -- Tipo de entrada
  entry_type TEXT NOT NULL DEFAULT 'global' CHECK (entry_type IN ('global', 'detailed')),
  
  -- Importe total (si es global)
  total_amount NUMERIC(12,2),
  
  -- Asiento contable generado
  accounting_entry_id UUID REFERENCES public.accounting_entries(id) ON DELETE SET NULL,
  
  -- Estado
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'posted', 'cancelled')),
  
  -- Notas
  notes TEXT,
  
  -- Auditoría
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  posted_at TIMESTAMPTZ,
  posted_by UUID REFERENCES auth.users(id),
  
  -- Constraint: solo un cierre por periodo y centro
  CONSTRAINT unique_closure_per_period UNIQUE (centro_code, closure_year, closure_month)
);

-- Tabla de líneas de detalle (subpartidas)
CREATE TABLE IF NOT EXISTS public.inventory_closure_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  closure_id UUID NOT NULL REFERENCES public.inventory_closures(id) ON DELETE CASCADE,
  
  -- Línea
  line_number INTEGER NOT NULL,
  category TEXT NOT NULL, -- 'food', 'paper', 'beverages', 'other'
  description TEXT NOT NULL,
  account_code TEXT, -- Cuenta de existencias (ej: 300, 310, etc.)
  variation_account TEXT, -- Cuenta de variación (ej: 610, 611, etc.)
  
  -- Importes
  initial_stock NUMERIC(12,2) NOT NULL DEFAULT 0,
  final_stock NUMERIC(12,2) NOT NULL DEFAULT 0,
  variation NUMERIC(12,2) GENERATED ALWAYS AS (final_stock - initial_stock) STORED,
  
  -- Auditoría
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT unique_line_per_closure UNIQUE (closure_id, line_number)
);

-- Índices para mejor performance
CREATE INDEX IF NOT EXISTS idx_inventory_closures_centro ON public.inventory_closures(centro_code);
CREATE INDEX IF NOT EXISTS idx_inventory_closures_period ON public.inventory_closures(closure_year, closure_month);
CREATE INDEX IF NOT EXISTS idx_inventory_closures_status ON public.inventory_closures(status);
CREATE INDEX IF NOT EXISTS idx_inventory_closure_lines_closure ON public.inventory_closure_lines(closure_id);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_inventory_closures_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_inventory_closures_updated_at
  BEFORE UPDATE ON public.inventory_closures
  FOR EACH ROW
  EXECUTE FUNCTION update_inventory_closures_updated_at();

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE public.inventory_closures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_closure_lines ENABLE ROW LEVEL SECURITY;

-- Admins pueden gestionar todo
CREATE POLICY "Admins can manage all inventory closures"
  ON public.inventory_closures
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage all inventory closure lines"
  ON public.inventory_closure_lines
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Usuarios pueden ver cierres de sus centros
CREATE POLICY "Users can view closures for accessible centres"
  ON public.inventory_closures
  FOR SELECT
  USING (
    centro_code IN (
      SELECT centro_code FROM v_user_centres WHERE user_id = auth.uid()
    )
  );

-- Usuarios pueden crear cierres para sus centros
CREATE POLICY "Users can create closures for accessible centres"
  ON public.inventory_closures
  FOR INSERT
  WITH CHECK (
    centro_code IN (
      SELECT centro_code FROM v_user_centres WHERE user_id = auth.uid()
    )
  );

-- Usuarios pueden actualizar borradores de sus centros
CREATE POLICY "Users can update draft closures for accessible centres"
  ON public.inventory_closures
  FOR UPDATE
  USING (
    status = 'draft' AND
    centro_code IN (
      SELECT centro_code FROM v_user_centres WHERE user_id = auth.uid()
    )
  );

-- Usuarios pueden eliminar borradores de sus centros
CREATE POLICY "Users can delete draft closures for accessible centres"
  ON public.inventory_closures
  FOR DELETE
  USING (
    status = 'draft' AND
    centro_code IN (
      SELECT centro_code FROM v_user_centres WHERE user_id = auth.uid()
    )
  );

-- Políticas para líneas de detalle
CREATE POLICY "Users can view lines for accessible closures"
  ON public.inventory_closure_lines
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.inventory_closures ic
      WHERE ic.id = inventory_closure_lines.closure_id
      AND ic.centro_code IN (
        SELECT centro_code FROM v_user_centres WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert lines for accessible closures"
  ON public.inventory_closure_lines
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.inventory_closures ic
      WHERE ic.id = inventory_closure_lines.closure_id
      AND ic.status = 'draft'
      AND ic.centro_code IN (
        SELECT centro_code FROM v_user_centres WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update lines for draft closures"
  ON public.inventory_closure_lines
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.inventory_closures ic
      WHERE ic.id = inventory_closure_lines.closure_id
      AND ic.status = 'draft'
      AND ic.centro_code IN (
        SELECT centro_code FROM v_user_centres WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete lines for draft closures"
  ON public.inventory_closure_lines
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.inventory_closures ic
      WHERE ic.id = inventory_closure_lines.closure_id
      AND ic.status = 'draft'
      AND ic.centro_code IN (
        SELECT centro_code FROM v_user_centres WHERE user_id = auth.uid()
      )
    )
  );

-- Comentarios para documentación
COMMENT ON TABLE public.inventory_closures IS 'Cierres de existencias mensuales - Regularización de inventario';
COMMENT ON TABLE public.inventory_closure_lines IS 'Líneas de detalle de cierres de existencias (subpartidas)';
COMMENT ON COLUMN public.inventory_closures.entry_type IS 'Tipo: global (un solo importe) o detailed (con subpartidas)';
COMMENT ON COLUMN public.inventory_closure_lines.category IS 'Categoría: food, paper, beverages, other';
COMMENT ON COLUMN public.inventory_closure_lines.variation IS 'Variación calculada automáticamente: final_stock - initial_stock';